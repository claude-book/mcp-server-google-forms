# Revisão de código — Servidor MCP Google Forms

**Data da revisão:** 8 de julho de 2026
**Ferramenta:** Claude Code, comando `/code-review high` (revisão multi-agente com verificação adversarial)
**Escopo:** todo o código do projeto — primeira revisão, feita antes do primeiro commit
**Versão amigável para não-programadores:** [revisao-de-codigo.html](revisao-de-codigo.html) — baixe e abra no navegador

> **Para quem lê no futuro (pessoa ou IA):** este documento registra os problemas conhecidos do código, a gravidade de cada um e as razões por trás das alterações já feitas. As referências `arquivo:linha` correspondem ao estado do código em 08/07/2026, **antes de qualquer correção** — linhas podem ter se deslocado desde então. Ao aplicar correções, atualize a coluna **Status** da tabela abaixo e registre a mudança no [Histórico de alterações](#histórico-de-alterações-e-suas-razões).

## Como a revisão foi feita

Sete agentes revisores independentes vasculharam o código, cada um por um ângulo diferente (varredura linha a linha, invariantes ausentes, contratos entre arquivos, reuso, simplificação, eficiência e profundidade do design), levantando **33 suspeitas**. Após remoção de duplicatas, **24 suspeitas únicas** foram julgadas por verificadores independentes, que tentaram prová-las ou derrubá-las: **15 confirmadas, 7 consideradas plausíveis e 2 refutadas**. As 10 mais importantes estão detalhadas abaixo.

- **Confirmado** = comprovado no código ou na documentação oficial do Google/SDK.
- **Plausível** = provável, mas depende de condições difíceis de demonstrar.

## Estado dos achados

| # | Achado | Gravidade | Status |
|---|--------|-----------|--------|
| 01 | Apagar/mover pode acertar o item errado | 🔴 Grave | ✅ Corrigido (08/07/2026) |
| 02 | Sem ferramenta de publicação — respostas inalcançáveis | 🔴 Grave | ✅ Corrigido (08/07/2026) — nova ferramenta `set_publish` |
| 03 | Autorização pode "dar certo" sem o refresh token | 🔴 Grave | ✅ Corrigido (08/07/2026) |
| 04 | Pontos sem modo quiz → erro 400 | 🟠 Moderado | ✅ Corrigido (08/07/2026) |
| 05 | Callback OAuth sem proteção CSRF (state) | 🟠 Moderado | ✅ Corrigido (08/07/2026) |
| 06 | Respostas de upload de arquivo aparecem vazias | 🟠 Moderado | ✅ Corrigido (08/07/2026) |
| 07 | Erros crus, sem tradução nem instrução | 🟠 Moderado | ✅ Corrigido (08/07/2026) |
| 08 | Cliente OAuth recriado a cada chamada | 🟠 Moderado | ✅ Corrigido (08/07/2026) |
| 09 | Porta 4571 ocupada → crash sem explicação | 🔵 Leve | ✅ Corrigido (08/07/2026) — porta efêmera |
| 10 | add_question baixa o formulário inteiro | 🔵 Leve | ⚖️ Aceito — o `forms.get` virou necessário (validações + quiz); ver histórico |

## Os 10 achados

### 01 — Apagar ou mover perguntas pode acertar o item errado

**Gravidade:** 🔴 Grave · **Veredito:** Confirmado · **Local:** `src/server.js:179`

**Em palavras simples:** um formulário do Google pode conter, além de perguntas, títulos de seção, imagens e quebras de página. As ferramentas de apagar e mover contam as posições considerando *tudo isso* — mas a instrução exibida diz "posição da pergunta". E o servidor não confere o que existe na posição antes de agir.

**Consequência:** você pede para apagar "a primeira pergunta" e o servidor pode apagar outra coisa — um cabeçalho, uma imagem — sem avisar e sem como desfazer. Posições inexistentes passam direto e voltam como erro técnico do Google.

**Detalhe técnico:** `delete_question` e `move_question` documentam o índice como "posição da pergunta", mas a API o trata como posição bruta de qualquer item (blocos de texto, imagens e quebras de página contam) e não há validação de limites — o item errado pode ser apagado/movido silenciosamente.

**Cenário de falha:** formulário com um bloco de texto na posição 0 e a primeira pergunta na posição 1: `delete_question` com `index=0` apaga o bloco de texto, não a pergunta — sem erro e sem confirmação. Índices negativos ou fora do intervalo (schema `z.number().int()` sem `.min/.max`) vão direto à API e voltam como 400 cru.

### 02 — Formulários criados não conseguem receber respostas sem etapa manual

**Gravidade:** 🔴 Grave · **Veredito:** Confirmado · **Local:** `src/server.js:85`

**Em palavras simples:** desde 30/06/2026, todo formulário criado por programa nasce como *rascunho não publicado* — ninguém consegue respondê-lo até que seja publicado. O servidor não tem nenhum comando para publicar.

**Consequência:** o fluxo completo que o servidor promete — criar o formulário, compartilhar o link e ler as respostas — nunca se completa sozinho. A única saída hoje é publicar manualmente no site do Google Forms.

**Detalhe técnico:** não existe ferramenta que chame `forms.setPublishSettings`, mas desde 30/06/2026 formulários criados via API nascem despublicados — verificado na documentação do Google que `setPublishSettings` é o método necessário.

**Cenário de falha:** usuário roda `create_form` + `add_question` e compartilha o `responderUri`; respondentes não conseguem enviar e `list_responses` retorna para sempre "Nenhuma resposta ainda".

### 03 — A autorização pode "dar certo" faltando a peça principal

**Gravidade:** 🔴 Grave · **Veredito:** Confirmado · **Local:** `scripts/get-token.js:54`

**Em palavras simples:** no passo de autorização, às vezes o Google não devolve a "chave de renovação" (refresh token) — a peça que permite ao servidor trabalhar sem pedir login toda hora. O script grava a configuração sem essa chave e, mesmo assim, mostra "Autorização concluída!".

**Consequência:** é como instalar uma fechadura nova, receber "instalação concluída" — e descobrir depois que a chave não veio na caixa. Tudo parece pronto, mas qualquer uso do servidor falha dali em diante, com mensagem que não aponta a causa.

**Detalhe técnico:** se o Google não retornar `refresh_token`, o script grava `config.json` sem o campo (`JSON.stringify` descarta `undefined`) e ainda imprime sucesso.

**Cenário de falha:** Google omite o refresh_token (raro mas documentado, mesmo com `prompt:'consent'` — p.ex. políticas de workspace); o usuário vê "Pronto. refreshToken salvo", mas toda chamada passa a falhar com "Falta o refreshToken em credentials/config.json".

### 04 — Pergunta valendo pontos é recusada se o "modo prova" não estiver ligado

**Gravidade:** 🟠 Moderado · **Veredito:** Confirmado · **Local:** `src/server.js:53`

**Em palavras simples:** para uma pergunta valer pontos, o formulário precisa antes estar em "modo quiz" (comando `set_quiz`). A ferramenta de adicionar pergunta não avisa dessa exigência nem ativa o modo sozinha.

**Consequência:** o caminho mais natural — criar um formulário e já adicionar uma pergunta valendo pontos — termina num erro técnico em inglês.

**Detalhe técnico:** `add_question` anexa `grading` sempre que `points` é numérico, sem verificar/ativar o modo quiz; a API rejeita grading em formulário não-quiz, e a descrição da ferramenta não menciona o pré-requisito.

**Cenário de falha:** `create_form` → `add_question` com `points:1` → `batchUpdate` retorna 400 INVALID_ARGUMENT ("grading properties can only be added to questions in forms configured as quizzes"), exposto cru ao cliente.

### 05 — A janela de autorização fica sem proteção contra intrusos

**Gravidade:** 🟠 Moderado · **Veredito:** Plausível · **Local:** `scripts/get-token.js:45`

**Em palavras simples:** durante a autorização, o script abre uma "porta de retorno" no computador para receber a confirmação do Google. Essa porta aceita qualquer confirmação, sem conferir se veio do processo que *você* iniciou — uma checagem padrão (o parâmetro *state*) ficou de fora.

**Consequência:** num cenário raro (página maliciosa aberta no navegador exatamente naqueles segundos), o servidor poderia acabar conectado à conta Google *de outra pessoa*. Probabilidade baixa, proteção simples.

**Detalhe técnico:** o callback OAuth em `localhost:4571` aceita qualquer `?code=` sem validar `state` (sem proteção contra CSRF/injeção de código de autorização).

**Cenário de falha:** enquanto o servidor local escuta, uma página maliciosa requisita `http://localhost:4571/?code=CODIGO_DO_ATACANTE`; o script troca o código e grava o refreshToken de uma conta controlada pelo atacante.

### 06 — Respostas com arquivos enviados aparecem em branco

**Gravidade:** 🟠 Moderado · **Veredito:** Confirmado · **Local:** `src/server.js:233`

**Em palavras simples:** o leitor de respostas só sabe exibir respostas de texto. Se o formulário tiver pergunta de "envio de arquivo" (criada no site do Forms), essas respostas aparecem vazias.

**Consequência:** você conclui que ninguém anexou nada — quando na verdade anexaram. A informação existe, mas fica invisível, sem aviso.

**Detalhe técnico:** `list_responses` só renderiza `textAnswers`; respostas em `fileUploadAnswers` aparecem como valor vazio.

**Cenário de falha:** formulário criado na UI com pergunta de upload é lido via `list_responses`: cada resposta imprime `- <pergunta>:` vazio.

### 07 — Quando algo falha, a mensagem é "tecniquês" sem instrução

**Gravidade:** 🟠 Moderado · **Veredito:** Confirmado · **Local:** `src/server.js:76` (afeta os 7 handlers)

**Em palavras simples:** quando algo dá errado — permissão expirada, formulário inexistente, limite do Google, configuração corrompida — o servidor repassa o erro cru, em inglês técnico, em vez de traduzir para uma instrução ("rode `npm run token` de novo").

**Consequência:** não dá para distinguir um problema de um minuto (reautorizar) de um defeito real, nem saber o próximo passo.

**Detalhe técnico:** nenhum dos 7 handlers tem try/catch nem existe camada de tradução de erros: falhas da API (401/403/404/429) e `config.json` corrompido (`JSON.parse` da linha 20) chegam crus ao cliente MCP. Confirmado no SDK (`mcp.js:135-162`) que a mensagem do throw vai verbatim ao cliente; um wrapper único cobriria todos os handlers.

**Cenário de falha:** refresh token revogado → toda ferramenta responde "invalid_grant" cru; config truncado → "Unexpected end of JSON input".

### 08 — A cada comando, o servidor refaz o "login" do zero

**Gravidade:** 🟠 Moderado · **Veredito:** Confirmado · **Local:** `src/server.js:16`

**Em palavras simples:** em vez de guardar a conexão com o Google e reaproveitá-la, o servidor a reconstrói inteira a cada comando — relê o arquivo de credenciais do disco e pede um "crachá de acesso" novo toda vez.

**Consequência:** cada comando fica 0,1–0,3s mais lento do que precisaria, e sequências rápidas podem esbarrar no limite de pedidos do Google.

**Detalhe técnico:** `getFormsClient()` relê/parseia `config.json` (I/O síncrono) e cria um OAuth2 client novo a cada chamada, zerando o cache de access token — cada invocação paga uma troca refresh→access token extra (comprovado em `oauth2client.js:348`: o token só é reutilizado se já estiver na instância).

**Cenário de falha:** todo tool call faz um round-trip HTTPS extra a `oauth2.googleapis.com`; sequências rápidas podem sofrer rate limit no endpoint de token.

### 09 — Se a porta 4571 estiver ocupada, a autorização quebra sem explicação

**Gravidade:** 🔵 Leve · **Veredito:** Confirmado · **Local:** `scripts/get-token.js:70`

**Em palavras simples:** o passo de autorização usa um "canal" fixo do computador (porta 4571). Se outro programa estiver usando esse canal, o script morre com uma tela de erro técnica.

**Consequência:** raro e restrito à configuração (que roda uma vez) — mas sem pista de como resolver quando acontece.

**Detalhe técnico:** `httpServer.listen(4571)` não tem listener de `'error'`: EADDRINUSE vira exceção não tratada; porta fixa, sem env nem fallback. Como clientes OAuth "Desktop app" aceitam loopback em qualquer porta, `listen(0)` (porta efêmera) resolveria sem reconfigurar o Google Cloud.

**Cenário de falha:** outro processo na 4571 → crash bruto com stack trace no meio do fluxo de autorização.

### 10 — Para cada pergunta adicionada, o servidor baixa o formulário inteiro

**Gravidade:** 🔵 Leve · **Veredito:** Confirmado · **Local:** `src/server.js:128`

**Em palavras simples:** antes de adicionar uma pergunta, o servidor baixa o formulário completo só para contar quantos itens ele tem.

**Consequência:** o dobro do trabalho e do tempo por pergunta; e se alguém estiver editando o formulário no navegador no mesmo instante, a pergunta pode entrar na posição errada.

**Detalhe técnico:** `add_question` faz `forms.get` só para calcular `items.length` — 2 chamadas de API por pergunta, com janela TOCTOU. Um parâmetro de índice opcional ou contagem em cache elimina o get. Nota verificada: a API **exige** `location.index` no `createItem`, então simplesmente omitir não é alternativa.

**Cenário de falha:** adicionar N perguntas custa 2N chamadas; edição concorrente na UI entre o get e o batchUpdate posiciona a pergunta errado.

## Itens menores, abaixo do corte

Verificados e reais, mas de baixa prioridade:

1. ✅ *Corrigido (08/07/2026).* A página "Autorização concluída!" pode nem aparecer no navegador — o `process.exit(0)` rodava antes de a resposta HTTP ser enviada. Agora o encerramento acontece no callback do `res.end`.
2. ✅ *Corrigido (08/07/2026).* A abertura automática do navegador só funcionava no macOS; agora usa `open`/`start`/`xdg-open` conforme o sistema.
3. ✅ *Corrigido (08/07/2026).* Versões divergentes (0.1.0 vs 0.2.0) — agora há fonte única: o servidor lê a versão do `package.json` (v0.3.0).
4. ✅ *Corrigido (08/07/2026).* Duplicação dos envelopes — helpers `text()`, `fail()` e `batchUpdate()` criados.
5. ⚖️ *Decisão: não adotado.* A biblioteca oficial `@google-cloud/local-auth` substituiria o fluxo manual, mas **não permite `prompt: "consent"`** — re-autorizações poderiam vir sem refresh_token, exatamente o achado 03. Mantivemos o fluxo próprio, corrigido (state, porta efêmera, guarda de refresh token).
6. ✅ *Corrigido (08/07/2026).* README reescrito com instruções genéricas de clone e registro.
7. *Mantido como melhoria futura.* Adicionar um novo tipo de pergunta exige alterar 3 lugares em sincronia (o `z.enum`, o `switch` e o mapa RADIO/CHECKBOX/DROP_DOWN).
8. *Mantido como melhoria futura.* Não há como *editar* uma pergunta existente: corrigir pontuação exige apagar e recriar, perdendo o vínculo (questionId) com respostas já recebidas.
9. *Mantido (decisão de design).* `config.json` duplica `clientId`/`clientSecret` do `client_secret*.json` — preferimos o config autocontido; rotação de segredo exige rodar `npm run token` de novo.

## Suspeitas descartadas na verificação

Registradas para que ninguém "conserte" o que não está quebrado:

1. **"O `default: throw` do switch em `buildQuestion` é código morto"** — descartado. A checagem é defesa legítima contra dessincronização futura entre o `z.enum` e o `switch`. **Não remover.**
2. **"`documentTitle: documentTitle || title` é redundante"** — descartado. A API do Forms **não** replica o título automaticamente: sem essa linha, os arquivos no Drive ficariam como *"Untitled form"*. A linha é funcional. **Não remover.**

## Próximos passos sugeridos

**Concluídos em 08/07/2026** (detalhes no histórico abaixo): os 3 graves, os 5 moderados, os 2 leves (um deles aceito com justificativa) e a preparação para publicação — README genérico, licença MIT, pacote renomeado para `mcp-server-google-forms`.

Ficam como melhorias futuras opcionais: registro único de tipos de pergunta (item menor 7), ferramenta de edição de pergunta existente (item 8) e paginação em `list_responses` para formulários com muitas respostas.

## Histórico de alterações e suas razões

> Registre aqui cada rodada de mudanças: o que mudou, por que, e como foi verificado.

### 08/07/2026 — Organização inicial do projeto (antes da revisão)

**O que mudou:** a raiz do projeto (tudo solto numa pasta só) foi reorganizada em:

```
src/server.js          → o servidor MCP
scripts/get-token.js   → autorização OAuth (roda uma vez)
credentials/           → segredos (client_secret*.json + config.json)
docs/                  → esta documentação
```

**Por quê:** separar código, utilitários e segredos. A pasta `credentials/` inteira está no `.gitignore`, o que reduz o risco de um segredo entrar no repositório por acidente — essencial para um futuro repositório público.

**Ajustes decorrentes (para nada quebrar):**
- `src/server.js` passou a ler `../credentials/config.json` (antes `./config.json`).
- `scripts/get-token.js` passou a procurar o `client_secret*.json` em `../credentials/` e a criar a pasta se não existir (`fs.mkdirSync`).
- `package.json`: `bin` e os scripts `start`/`token` apontam para os novos caminhos.
- README atualizado (estrutura, lista completa das 7 ferramentas — antes listava só 3 — e correção do caminho `Developer/_Outros/` → `Developer/Outros/`, um erro que também existia no registro do servidor no Claude Code e o mantinha inoperante desde a criação).
- Registro do servidor no Claude Code refeito para o novo caminho — status passou de "✘ Failed to connect" para "✔ Connected".

**Verificação:** `node --check` nos dois arquivos + handshake MCP real via stdio (`initialize` + `tools/list` responderam com as 7 ferramentas) + `claude mcp get google-forms` conectado.

### 08/07/2026 — Revisão de código

Revisão `/code-review high` executada (este documento). À época, todos os 10 achados constavam como "Pendente" — as correções vieram na entrada seguinte.

### 08/07/2026 — Correções da revisão e preparação para publicação (v0.3.0)

**O que mudou e por quê:**

- **`set_publish` (achado 02):** nova ferramenta chamando `forms.setPublishSettings` — sem ela, formulários criados via API não conseguiam receber respostas.
- **Validação de posições (achado 01):** `delete_question` e `move_question` agora conferem os limites e recusam apagar itens que não sejam perguntas, dizendo o que há na posição; `get_form` passou a listar `posição: tipo` para conferência; as descrições dizem explicitamente que as posições contam *todos* os itens.
- **Guarda do refresh token (achado 03):** `get-token.js` só grava o config e anuncia sucesso se o Google enviar o `refresh_token`; caso contrário, instrui a remover o acesso antigo em myaccount.google.com/permissions e repetir.
- **Pré-checagem de quiz (achado 04):** `add_question` com `points` verifica o modo quiz e orienta a usar `set_quiz`, em vez de deixar a API responder 400 em inglês.
- **Proteção CSRF (achado 05):** o callback OAuth valida um `state` aleatório gerado por execução.
- **Uploads visíveis (achado 06):** `list_responses` exibe `fileUploadAnswers` ("arquivo enviado: nome") e sinaliza formatos não textuais.
- **Tradução de erros (achado 07):** todos os handlers passam por um wrapper único que converte erros da API (401/403/404/429/invalid_grant) e config corrompido em instruções acionáveis em português.
- **Cliente memoizado (achado 08):** o cliente OAuth2/Forms é criado uma vez e reutilizado — o access token fica em cache na instância e só é renovado ao expirar.
- **Porta efêmera + tratamento de erro (achado 09):** o servidor local de autorização usa `listen(0)` (o sistema escolhe uma porta livre — clientes OAuth "Desktop app" aceitam qualquer porta de loopback) e tem handler de `error`.
- **Achado 10 — aceito:** o `forms.get` do `add_question` virou peça necessária (valida o índice pedido e checa o modo quiz); o custo extra é justificado, e a corrida TOCTOU é inerente à API (não existe "append atômico").
- **Itens menores corrigidos:** flush da página de sucesso antes de encerrar; abertura de navegador multiplataforma; versão única lida do `package.json`; helpers `text()`/`fail()`/`batchUpdate()`; `add_question` ganhou parâmetro opcional `index`.
- **Publicação:** pacote renomeado para `mcp-server-google-forms` (acompanhando o repositório github.com/claude-book/mcp-server-google-forms), licença MIT adicionada, campo `repository` e `engines` (Node ≥ 18) no `package.json`, README reescrito com instruções genéricas.
- **Decisão registrada:** mantivemos o fluxo OAuth próprio (corrigido) em vez de adotar `@google-cloud/local-auth`, porque a biblioteca não expõe `prompt: "consent"` — re-autorizações poderiam vir sem refresh_token, recriando o achado 03.

**Verificação:** `node --check` nos dois arquivos + handshake MCP real via stdio (`initialize` + `tools/list`), confirmando as 8 ferramentas e a versão 0.3.0 no `serverInfo`.

### 08/07/2026 — Teste de ponta a ponta com a API real (v0.3.1)

**O que foi testado (contra a API real do Google Forms, com formulário de verdade):** criar formulário; guarda de pontos-sem-quiz (recusou com instrução ✔); modo quiz liga/desliga ✔; adicionar, mover e apagar perguntas com as mensagens nomeando o item afetado ✔; guardas de posição inexistente (mensagem amigável, sem 400 cru ✔); **publicar e despublicar com `set_publish` ✔** — fechando na prática o achado 02; `list_responses` vazio com dica de publicação ✔; e o novo `get-token.js` (parâmetro `state` presente na URL ✔, porta dinâmica em vez da 4571 fixa ✔).

**Bug descoberto e corrigido durante o teste (v0.3.1):** com o cliente memoizado (correção do achado 08), um servidor **em execução** continuava usando o refresh token antigo mesmo depois de `npm run token` — a mensagem de erro mandava reautorizar, mas reautorizar não resolvia até reiniciar o servidor, contradizendo a própria instrução. Correção em `src/server.js`: ao detectar erro de autenticação (`isAuthError`), o wrapper descarta o cliente memoizado e repete a operação uma única vez com o config recarregado. Reautorizar passou a valer imediatamente, sem reiniciar nada.

**Contexto útil para leitores:** apps OAuth em modo "Testing" no Google Cloud têm autorização que **expira em 7 dias** — foi exatamente o que derrubou as credenciais deste projeto entre 30/06 e 08/07 e disparou a descoberta acima. A dica entrou no README (Solução de problemas).

**Limitação conhecida (registrada):** chamadas de ferramentas disparadas em paralelo são atendidas concorrentemente; duas inserções simultâneas podem calcular a mesma posição (a corrida TOCTOU do achado 10, aceita). Em uso normal — uma chamada por vez — não há efeito.

### 08/07/2026 — Site do projeto no GitHub Pages: página inicial, privacidade e termos

**O que mudou:** `docs/` ganhou `index.html` (apresentação do projeto), `privacidade.html` (política de privacidade) e `termos.html` (termos de uso), servidos pelo GitHub Pages em `https://claude-book.github.io/mcp-server-google-forms/`, direto da pasta `docs/` na branch `main` (sem GitHub Actions).

**Por quê:** com o app OAuth em modo **In production** (mudança feita para os tokens não expirarem a cada 7 dias), a tela de Branding do Google Cloud pede homepage, política de privacidade e termos — e o domínio dessas URLs precisa ser "autorizável" pelo dono. `github.com` não pode ser autorizado (não é nosso), mas `claude-book.github.io` pode: o `github.io` está na Public Suffix List, então cada subdomínio conta como domínio independente do dono da conta/organização.

**Decisão registrada:** a **verificação da marca** ("Verify branding") **não é necessária** para o modelo do livro — cada leitor cria o próprio projeto no Google Cloud e aceita a tela de "app não verificado" uma única vez (Avançado → Acessar). O preenchimento do Branding é polimento e material didático; a verificação formal do Google (que envolve Search Console e análise) fica como opção futura.

### 08/07/2026 — Verificação da marca iniciada (a pedido do autor)

Revendo a decisão acima, o autor optou por concluir a verificação da marca. O que foi feito:

- **App renomeado no console** de "claude-forms-mcp" para **"mcp-server-google-forms"**, casando com o nome exibido no site (uma das exigências apontadas pelo verificador do Google).
- **Propriedade registrada no Google Search Console** (tipo "Prefixo do URL": `https://claude-book.github.io/mcp-server-google-forms/`), com verificação pelo método do arquivo HTML.
- **`docs/google610e27547249eb1a.html`** — arquivo de verificação de propriedade do Google. ⚠️ **Nunca remover este arquivo**: a verificação de propriedade (e com ela a marca verificada do app OAuth) cai se ele sair do ar.
