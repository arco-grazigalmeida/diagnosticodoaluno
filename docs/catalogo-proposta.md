# Catálogo do Combo Vitalício: proposta para validar

Versão `doc-aulas-2026-10-07-provisorio`. Fontes: prints da área de membros (Hotmart) e o Google Doc "Combo_Vitalicio_Modulos_e_Aulas_COMPLETO", ambos de 07/10/2026.

| O que é | Status |
|---|---|
| Títulos das 20 trilhas | **Real** (copiado dos prints) |
| Temas, nível, pré-requisitos, sequência | **Proposta** do protótipo. A equipe precisa validar |
| Módulos e aulas | **Real**: 1.013 aulas em 16 trilhas, copiadas do documento por `src/importar_doc.py` |
| Duração de cada aula | **Falta**. O plano usa 20 min por aula e marca cada uma como "estimado" |
| Links | **Falta**. O aluno usa o botão "Abrir a área de membros" com o nome da trilha |

## 1. Sequência pedagógica proposta

```
                    ┌─ CTX Protocolo Glabela (express) ── BTX Especialista em Botox ─┐
                    │                                                                ├─ COMP Complicações
ANAT Anatomia ──────┼─ CPX Preenchimento Express ── FEP Especialista em Preenchimento ┘
                    │                                   ├─ Olheiras · Labial · Rinomodelação
                    │                                   └─ Full Face ── Full Face +10 ml
                    ├─ BIO Bioestimuladores
                    ├─ FIOS Fios
                    └─ CAD Anatomia em Cadáveres

Sem pré-requisito: CORP Corporal · ATD Atenda Todo Santo Dia
Não entram no cronograma (recursos): Ebook · Aulas Ao Vivo · Bônus · Suporte Técnico
```

Exemplos reais do motor com esse catálogo:
- Iniciante, prioridade preenchimento: Anatomia, Preenchimento Express, Especialista em Preenchimento, Protocolo Glabela, Especialista em Botox.
- Anatomia concluída, quer muito o Labial: Especialista em Preenchimento, Labial, Olheiras, Rinomodelação, Full Face.
- Experiente em preenchimento, quer o Labial: Labial, Full Face, Olheiras, Rinomodelação, Full Face +10 ml.

## 2. Tabela proposta (validar linha a linha)

Nível: 1 Iniciante, 2 Básico, 3 Intermediário, 4 Avançado.

| ID | Trilha | Tema proposto | Nível | Pré-requisito | Carga antiga (não usada mais) |
|---|---|---|---|---|---|
| ANAT | Formação Especialista em Anatomia | Anatomia facial | 1 | nenhum | 12 h |
| CAD | Anatomia em Cadáveres | Anatomia facial | 3 | ANAT | 4 h |
| CTX | CTX - Protocolo Glabela | Toxina botulínica | 1 | ANAT | 2 h |
| BTX | Formação Especialista em Botox | Toxina botulínica | 2 | ANAT | 12 h |
| CPX | Curso de Preenchimento Express | Preenchimento facial | 1 | ANAT | 3 h |
| FEP | Formação Especialista em Preenchimento | Preenchimento facial | 2 | ANAT | 12 h |
| OLH | Imersão Avançada em Preenchimento de Olheiras | Preench. avançado por região | 3 | FEP | 4 h |
| LAB | Imersão Avançada em Preenchimento Labial | Preench. avançado por região | 3 | FEP | 4 h |
| RINO | Imersão Avançada em Rinomodelação | Preench. avançado por região | 3 | FEP | 4 h |
| FF | Imersão Avançada em Full Face | Preench. avançado por região | 3 | FEP | 4 h |
| FF10 | Imersão Avançada em Full Face com mais de 10 ml | Preench. avançado por região | 4 | FF | 4 h |
| BIO | Formação Especialista em Bioestimuladores | Bioestimuladores | 2 | ANAT | 10 h |
| FIOS | Formação Especialista em Fios | Fios | 3 | ANAT | 10 h |
| CORP | Formação Especialista em Corporal | Harmonização corporal | 2 | nenhum | 10 h |
| COMP | Curso Avançado de Complicações | Complicações e segurança | 3 | FEP e BTX | 6 h |
| ATD | Atenda Todo Santo Dia | Atendimento e rotina de consultório | 1 | nenhum | 4 h |

## 2b. Tamanho real das trilhas (com 20 min por aula, até chegarem as durações)

| Trilha | Módulos | Aulas | Estimativa |
|---|---|---|---|
| FEP Preenchimento | 8 | 265 | ~88 h |
| BTX Botox | 9 | 134 | ~45 h |
| ANAT Anatomia | 18 | 117 | ~39 h |
| BIO Bioestimuladores | 10 | 109 | ~36 h |
| CAD Cadáveres | 2 | 100 | ~33 h |
| CORP Corporal | 6 | 68 | ~23 h |
| FIOS Fios | 7 | 59 | ~20 h |
| COMP Complicações | 6 | 35 | ~12 h |
| ATD Atenda | 7 | 24 | ~8 h |
| CPX Express | 4 | 20 | ~7 h |
| LAB, RINO, FF10, CTX, OLH, FF | 1 a 3 | 10 a 17 | 3 a 6 h cada |

Consequência: um aluno iniciante com 3 h por semana leva mais de um ano só para Anatomia e Preenchimento. Ver decisão 8.

## 3. Decisões que só a equipe pode tomar

1. **Express exige Anatomia?** Hoje sim. Se o Express foi pensado como porta de entrada rápida, tirar o pré-requisito faz o aluno começar a praticar antes. O risco é ele pular a base.
2. **Complicações exige Preenchimento e Botox?** Hoje sim, então só aparece para quem já passou dos dois. Alternativa: exigir só Anatomia e recomendar cedo, como segurança.
3. **Express depois da Formação completa.** O motor tira o Express da sequência quando a Formação do mesmo tema já vem antes. Confirmar que o Express é um subconjunto da Formação.
4. **Fios no nível 3 e Corporal sem pré-requisito.** Validar.
5. **"Atenda Todo Santo Dia"** foi classificado como gestão de consultório pelo título. Confirmar o conteúdo.
6. **Título completo do Ebook** ("A Ciência e Arte do Preenchimento…", cortado no print) e a qual curso ele se liga. Hoje está ligado a Olheiras como material complementar.
7. **Ordem das abas Aulas Ao Vivo, Bônus e Suporte**: confirmar que não são cursos com aulas a planejar.
8. **Trilha essencial.** Marcar quais módulos são essenciais e quais são aprofundamento (ex.: os 90 casos clínicos do Módulo 5 da FEP). Sem isso, o plano manda o aluno assistir tudo em ordem, e o prazo previsto desanima.
9. **Associações que o importador fez por conteúdo** (o documento não tinha o nome da trilha):
   - "FEB — Formação Especialista em Bioestimuladores / Toxina" foi tratada como **Formação Especialista em Botox**, porque o conteúdo é de toxina. A trilha de Bioestimuladores é a "FEBio".
   - "Conteúdos complementares" (anatomia por terço da face) foi tratada como **Formação Especialista em Anatomia**.
   - A seção "Protocolo Glabela" foi tratada como o curso **CTX**. "Anatomia em cadáveres" e "Laboratório de anatomia em cadáver fresco" como **Anatomia em Cadáveres**.
10. **O que ficou fora do plano** (41 seções, lista em `src/catalogo-aulas.json`, campo `fora_do_plano`): módulos de ao vivo, grupo, suporte e Zoom; todos os módulos "Bônus"; "FEP — Conteúdos adicionais" (convidados); a Imersão de Rinomodelação repetida dentro da FEP (já é a trilha RINO); a turma "Dias 9 e 10 de fevereiro" do Full Face (mesmas aulas da gravação). Confirmar.

## 4. O que falta, exatamente

Para as 1.013 aulas já cadastradas:

| Campo na aba Catálogo | O que preencher | Sem ele |
|---|---|---|
| `duracao_min` | Duração de cada aula em minutos | Prazos usam 20 min por aula, marcado como "estimado" |
| `link_aula` | Link direto da aula na Hotmart | Aluno abre a área de membros e procura a trilha |
| `link_curso` | Link de cada trilha | Mesmo efeito acima |
| `materiais` | Ebooks, PDFs e apostilas por curso | Atividade complementar fica genérica |

**Caminho mais rápido para as durações:** a Hotmart mostra a duração de cada vídeo. Preencher primeiro FEP, ANAT, BTX e CPX, que são as trilhas que mais aparecem como ponto de partida. Para atualizar as aulas, exporte o Google Doc como .md e rode `python3 -I src/importar_doc.py <arquivo>`.
