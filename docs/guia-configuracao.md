# Guia de configuração — integração com Google Sheets

Tempo estimado: 20 a 30 minutos. Quem faz: alguém da equipe com conta Google da operação (não pessoal).

## 1. Criar a planilha
1. No Google Drive: **Novo › Upload de arquivo** › `planilha/modelo-diagnostico-combo-vitalicio.xlsx`.
2. Abra e use **Arquivo › Salvar como Planilhas Google**. Apague o .xlsx enviado.
3. **Compartilhar**: só a equipe autorizada, como *Editor* ou *Leitor*. Nunca "Qualquer pessoa com o link". A planilha contém nome e e-mail dos alunos.
4. A aba **Catálogo** já traz as 20 trilhas reais, sem aulas. Complete com módulos e aulas (uma linha por aula, ver `catalogo-proposta.md`) e atualize `versao_catalogo` na aba **Configuração**.

## 2. Instalar o backend
1. Na planilha: **Extensões › Apps Script**.
2. Apague o conteúdo de `Código.gs` e cole `apps-script/Code.gs`. Salve.
3. No seletor de funções, escolha `setup` e clique **Executar**. Autorize com a conta da equipe.
   - O `setup` cria as colunas que faltarem, congela os cabeçalhos e protege as abas de registro.
4. **Implantar › Nova implantação › Tipo: App da Web**
   - Executar como: **Eu** (a conta da equipe)
   - Quem pode acessar: **Qualquer pessoa**. É o necessário para alunos sem login Google. O endpoint só aceita gravação e entrega o catálogo, nunca devolve dados de alunos.
5. Copie a URL que termina em `/exec`.

> Para atualizar o código depois: **Implantar › Gerenciar implantações › editar › Nova versão**. Assim a URL continua a mesma.

## 3. Ligar a página
1. Em `src/app.js`, preencha `CONFIG.ENDPOINT` com a URL `/exec`.
2. Ajuste `PRIVACY_CONTACT` e o texto de privacidade (função `privacyNotice`).
3. Gere a página: `node src/build.js`. O resultado é `pagina/index.html`, um arquivo único sem dependências.
4. Hospede o `index.html` em qualquer hospedagem estática: Hostinger, Netlify, GitHub Pages ou a área de membros, se ela aceitar HTML.

Com `ENDPOINT` vazio, a página roda em **modo demonstração**: usa o catálogo embutido na página (`src/catalogo.js`) e não envia nada.

## 4. Testar antes de divulgar
- [ ] Abra a página e confirme que os cursos oficiais aparecem na etapa 2. Ela lê o catálogo da planilha.
- [ ] Faça um diagnóstico completo e confira as linhas nas abas Diagnósticos (status "plano gerado"), Planos de estudo e Cronograma.
- [ ] No campo "área", digite `=1+1` e confirme que a planilha grava como texto.
- [ ] Desligue o Wi-Fi e clique em "Gerar meu plano". A página deve mostrar o erro e manter as respostas. Religue e clique em "Tentar novamente". Deve existir uma única linha para aquele diagnóstico.
- [ ] Teste no celular (Android e iPhone) e no computador.

## 5. Como funciona a proteção contra duplicatas e falhas
- A página gera um ID por diagnóstico e reutiliza esse ID em todas as tentativas.
- O servidor trava a gravação (LockService) e procura o ID na aba de diagnósticos:
  - Se o diagnóstico já tem status "plano gerado", devolve sucesso sem gravar de novo.
  - Se ficou registro pela metade de uma falha anterior, o servidor limpa e regrava.
- O aluno só vê "Plano salvo" depois da confirmação do servidor. Se o envio falhar, ele pode tentar de novo ou ver o plano marcado como "ainda não salvo".
- Refazer o diagnóstico cria um ID novo. O histórico anterior é preservado.

## 6. Manutenção do catálogo
- Para tirar uma aula ou curso do ar sem apagar, coloque `não` na coluna `ativo`.
- Vários temas ou pré-requisitos vão na mesma célula, separados por `;`.
- Nível do curso: 1 = Iniciante, 2 = Básico, 3 = Intermediário, 4 = Avançado.
- `duracao_min` vazio faz o plano usar uma estimativa, que o aluno vê marcada.
- Links só são exibidos se começarem com `https://`.
- O servidor recusa planos que citem cursos fora do catálogo ativo. Por isso, mudar o catálogo não quebra planos antigos, apenas os novos passam a usar a versão atual.

## 7. Limites do Apps Script (plano gratuito)
- Cerca de 20 mil chamadas por dia e 6 minutos por execução. Cada diagnóstico leva poucos segundos.
- Para envios simultâneos em massa (por exemplo, um disparo para toda a base no mesmo minuto), alguns alunos podem ver "Servidor ocupado". A página permite tentar de novo sem duplicar. Para disparos grandes, divida o envio em ondas.
- Há um limite de 6 envios a cada 10 minutos por e-mail, como proteção contra abuso.
