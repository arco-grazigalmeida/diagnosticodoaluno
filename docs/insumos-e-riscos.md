# Insumos pendentes e pontos de atenção

## Insumos que faltam para a versão final

| # | Insumo | Por que bloqueia | Formato ideal |
|---|---|---|---|
| 1 | **Catálogo oficial** (cursos, módulos, aulas, ordem) | Hoje todo o conteúdo é fictício | Preencher a aba **Catálogo** do modelo |
| 2 | **Duração e link de cada aula** | Sem duração, o cronograma usa estimativas. Sem link, não aparece o botão "Acessar" | Colunas `duracao_min` e `link_aula` |
| 3 | **Pré-requisitos e sequência pedagógica validados** | Definem a ordem do plano | Colunas `prerequisitos` e `nivel`, mais decisão sobre a exceção para cursos em andamento (ver lógica, item 2.2) |
| 4 | **Temas oficiais** | São as opções de escolha da etapa 2. Hoje saem do catálogo demo | Coluna `temas`. Recomendado: entre 5 e 8 temas, com nomes que o aluno reconheça |
| 5 | **Identidade visual (parcial)** | Visual aplicado a partir do banner oficial (preto e dourado, fotos do Dr. João). Faltam logo do Combo Vitalício sem a marca Black Friday e os códigos exatos de cor e fonte | Logo em PNG ou SVG e guia de marca |
| 6 | **Planilha de destino + conta da equipe** | Necessárias para ligar a integração | Seguir `guia-configuracao.md` |
| 7 | **Texto de privacidade e canal de contato** | Hoje há texto provisório | Texto revisado pelo jurídico e um e-mail ou canal de suporte |
| 8 | (Opcional) **Questões objetivas com gabarito aprovadas** | Permitiriam medir o nível em vez de só usar autoavaliação | 3 a 5 questões por tema |

## Pontos de atenção (visão de produto e CX)

1. **O formulário é longo.** São 7 etapas e mais de 40 perguntas, o que pode derrubar a taxa de conclusão.
   - O que já foi feito: só 16 perguntas são obrigatórias (uma delas condicional), e o rascunho fica salvo no navegador.
   - Recomendação: medir a taxa de conclusão por etapa. Se cair muito, mover a etapa 7 (Sugestões) para depois do plano. A etapa 7 não afeta a recomendação, e após receber valor o aluno tende a responder com mais boa vontade.
2. **O progresso nos cursos é declarado pelo aluno.** "Concluí 50%" vira uma estimativa de aulas. O maior salto de qualidade do plano viria de integrar com a plataforma de cursos (progresso real). Vale verificar se a área de membros tem API ou exportação.
3. **O plano só tem valor se o aluno voltar a ele.** Hoje ele imprime ou salva em PDF. Próximos passos de maior impacto em retenção:
   - Enviar o plano por e-mail, com o cronograma.
   - Lembretes semanais.
   - Um link pessoal do plano. Se for criado, precisa de token secreto por aluno e não pode usar o e-mail na URL.
4. **A aba "Sugestões de atualização" é um ativo de produto.** Tem a coluna `status_analise` para triagem. Sugestão: revisar uma vez por mês e devolver ao aluno o que virou conteúdo, o que reforça a confiança no combo.
5. **O backend é público por design** (Apps Script como "Qualquer pessoa"). Proteções ativas:
   - honeypot contra robôs
   - limite de envios por e-mail
   - tamanho máximo de envio
   - validação de cursos contra o catálogo
   - nenhum dado de aluno é devolvido

   Não há verificação de que o e-mail pertence a um comprador. Se isso importar, a página pode cruzar o e-mail com a lista de compradores numa aba restrita.
6. **LGPD.** Coletamos nome, e-mail e respostas educacionais. Os campos abertos alertam para não informar dados de pacientes ou de saúde.
   - Falta definir: prazo de retenção, quem acessa e o canal para o aluno pedir exclusão.
7. **Escala.** O Apps Script atende bem um uso orgânico. Para um disparo massivo simultâneo, veja o guia, item 7.

## Arquivos entregues

- `pagina/index.html`: página pronta. Arquivo único, abre em modo demonstração.
- `apps-script/Code.gs`: backend.
- `planilha/modelo-diagnostico-combo-vitalicio.xlsx`: modelo com as 5 abas, mais Configuração e Leia-me.
- `docs/logica-recomendacao.md`: regras do motor.
- `docs/guia-configuracao.md`: passo a passo da integração.
- `src/`: código-fonte. `node src/build.js` gera a página e `python3 src/build_xlsx.py <demo.json>` gera o modelo.
