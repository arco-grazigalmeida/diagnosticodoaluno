# Catálogo do Combo Vitalício: proposta para validar

Versão `hotmart-2026-10-07-provisorio`. Fonte: prints da área de membros (Hotmart) enviados em 07/10/2026.

| O que é | Status |
|---|---|
| Títulos das 20 trilhas | **Real** (copiado dos prints) |
| Temas, nível, pré-requisitos, sequência | **Proposta** do protótipo. A equipe precisa validar |
| Carga estimada de cada curso | **Chute provisório** para o plano funcionar. Aparece ao aluno como "provisória" |
| Módulos, aulas, duração, links | **Faltam**. Nada foi inventado. O plano usa blocos de estudo e o botão "Abrir a área de membros" |

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

| ID | Trilha | Tema proposto | Nível | Pré-requisito | Carga provisória |
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

## 3. Decisões que só a equipe pode tomar

1. **Express exige Anatomia?** Hoje sim. Se o Express foi pensado como porta de entrada rápida, tirar o pré-requisito faz o aluno começar a praticar antes. O risco é ele pular a base.
2. **Complicações exige Preenchimento e Botox?** Hoje sim, então só aparece para quem já passou dos dois. Alternativa: exigir só Anatomia e recomendar cedo, como segurança.
3. **Express depois da Formação completa.** O motor tira o Express da sequência quando a Formação do mesmo tema já vem antes. Confirmar que o Express é um subconjunto da Formação.
4. **Fios no nível 3 e Corporal sem pré-requisito.** Validar.
5. **"Atenda Todo Santo Dia"** foi classificado como gestão de consultório pelo título. Confirmar o conteúdo.
6. **Título completo do Ebook** ("A Ciência e Arte do Preenchimento…", cortado no print) e a qual curso ele se liga. Hoje está ligado a Olheiras como material complementar.
7. **Ordem das abas Aulas Ao Vivo, Bônus e Suporte**: confirmar que não são cursos com aulas a planejar.

## 4. O que falta, exatamente

Para **cada uma das 16 trilhas** da tabela acima:

| Campo na aba Catálogo | O que preencher | Sem ele |
|---|---|---|
| `modulo_id`, `modulo_titulo`, `modulo_ordem` | Módulos na ordem da área de membros | Plano mostra "Etapa 1, 2…" genéricas |
| `aula_id`, `aula_titulo`, `aula_ordem` | Uma linha por aula | Plano mostra "Bloco 3 de 15" em vez do nome da aula |
| `duracao_min` | Duração de cada aula em minutos | Prazos usam a carga provisória |
| `link_aula` | Link direto da aula na Hotmart | Aluno abre a área de membros e procura a trilha |
| `link_curso` | Link da trilha | Mesmo efeito acima |
| `carga_estimada_h` | Só enquanto as aulas não forem cadastradas: carga real total | Previsões usam o chute da tabela |
| `materiais` | Ebooks, PDFs e apostilas de cada curso | Atividade complementar fica genérica |

**Caminho mais rápido:** exportar da Hotmart a lista de módulos e aulas com duração (ou copiar a estrutura de cada trilha) e colar na aba Catálogo, uma linha por aula, repetindo `curso_id` e os dados do curso. Começar pelos 4 cursos que mais aparecem como ponto de partida: ANAT, FEP, BTX e CPX.
