# Estudo comparativo — outros servidores MCP para Google Forms

**Data do estudo:** 10 de julho de 2026
**Método:** 7 agentes de pesquisa independentes (Claude Code), um por repositório — cada um clonou o projeto e leu **100% do código-fonte relevante**, além do README e da documentação. Os relatórios foram consolidados neste documento.
**Objetivo:** comparar o nosso servidor (`mcp-server-google-forms`) com os servidores MCP para Google Forms publicados no GitHub, identificar melhorias que valem a pena adotar e anti-padrões a evitar.

> **Para quem lê no futuro (pessoa ou IA):** os fatos abaixo refletem o estado de cada repositório em 10/07/2026. A tabela de [melhorias recomendadas](#melhorias-recomendadas) tem coluna **Status** — atualize-a ao implementar cada item e registre a mudança no histórico da [revisão de código](revisao-de-codigo.md).

## Os 7 repositórios estudados

| Repositório | Linguagem | Ferramentas | Estado (10/07/2026) |
|---|---|---|---|
| [MatthewWolff/google-forms-mcp](https://github.com/MatthewWolff/google-forms-mcp) | TypeScript | 27 | Ativo, publicado no npm e no MCP Registry, com testes e CI |
| [udecode/google-forms-mcp](https://github.com/udecode/google-forms-mcp) | TypeScript | 12 | Funcional, com defeitos conhecidos documentados no próprio projeto |
| [KamaruSama/mcp-google-forms](https://github.com/KamaruSama/mcp-google-forms) | Python | 19 | Projeto de um dia (abr/2026), focado em quizzes, licença proprietária |
| [rishapgandhi/google_mcp](https://github.com/rishapgandhi/google_mcp) | Python | 43 (4 de Forms) | Jovem (jun/2026); cobre 10 produtos Google, Forms é módulo raso |
| [matteoantoci/google-forms-mcp](https://github.com/matteoantoci/google-forms-mcp) | TypeScript | 5 | Abandonado desde mai/2025 |
| [masatoshi118/mcp_google_froms](https://github.com/masatoshi118/mcp_google_froms) | TypeScript | 5 | Projeto de um dia (mar/2025), em japonês, sem licença |
| [ag2-mcp-servers/google-forms-api](https://github.com/ag2-mcp-servers/google-forms-api) | Python | 9 (cruas) | Gerado automaticamente, autenticação quebrada de fábrica |

## Perfil de cada um

### MatthewWolff/google-forms-mcp — a referência de engenharia

O único projeto com padrão profissional: 27 ferramentas em 6 categorias, **9 tipos de pergunta** (inclui escala linear, data, hora e avaliação por estrelas), paginação de respostas, exportação CSV, listagem/exclusão de formulários via Drive, notificações Pub/Sub e ferramentas de análise estatística embutidas. Tem 33 testes de integração contra a API real, CI no GitHub Actions, publicação no npm com *provenance* e annotations MCP (`readOnlyHint`, `destructiveHint`) nas ferramentas. Mesma stack que a nossa (Node + SDK MCP + googleapis + zod).

Destaques que inspiraram melhorias: `build_form` (formulário inteiro em uma chamada), `get_form_summary` (resumo legível em vez do JSON gigante) e o padrão de erro das ferramentas de análise — ao errar o nome de uma pergunta, devolvem a lista de perguntas disponíveis para o modelo se autocorrigir.

Fraquezas: a maioria das ferramentas repassa erro cru da API; não tem publicação (`setPublishSettings`); quiz só liga/desliga, **sem pontos nem gabarito**; `delete_form` diz "permanente" mas manda para a lixeira.

### udecode/google-forms-mcp — boa documentação, design comprometido

12 ferramentas, mas só 3 tipos de pergunta e um defeito central de design: **todo item é inserido na posição 0** (o README ensina o modelo a adicionar perguntas em ordem reversa para compensar). Tem `update_question`/`update_form` com validação de índice (ideia boa), seções e páginas, e o diferencial de uma **SKILL.md** ensinando o LLM a usar o servidor e contornar erros conhecidos da API. Bugs visíveis: `create_form` envia um campo que a própria documentação do projeto diz que a API rejeita; link de resposta montado com formato errado; testes que testam *cópias divergentes* das funções em vez do código real; escopo do Drive **inteiro** com o refresh token em texto claro no `.mcp.json`.

### KamaruSama/mcp-google-forms — especialista em quiz, com ideias boas

19 ferramentas focadas no caso "professor gera prova com IA": perguntas com gabarito e pontos, adição **em lote** numa única operação (`batch_add_true_false`), conferência de gabarito pós-criação (`verify_answer_keys`), visão compacta do formulário (`list_questions`), diagnóstico de credenciais (`auth_status`) e um "escape hatch" (`raw_batch_update`) que repassa qualquer requisição crua à API. Defeito fatal: as opções de Verdadeiro/Falso estão **fixas no código em tailandês**. Sem nenhum try/except, sem paginação, sem publicação. **Licença proprietária ("All rights reserved")** — ver [nota sobre licenças](#nota-sobre-licenças).

### rishapgandhi/google_mcp — canivete suíço raso

Servidor "Google Workspace inteiro": Gmail, Agenda, Drive, Docs, Planilhas, Slides, Forms, Tasks, Chat e Meet — 43 ferramentas com um único consentimento OAuth de 12 escopos. A parte de Forms (4 ferramentas) é um **subconjunto estrito do nosso**: mesmos 5 tipos de pergunta, sem quiz, sem publicar, sem apagar/mover, sem validação de entrada, erros crus. Única capacidade que não temos: compartilhar o formulário com um e-mail específico via API do Drive. Sem testes, sem CI.

### matteoantoci/google-forms-mcp — mínimo e abandonado

5 ferramentas, 2 tipos de pergunta, inserção fixa na posição 0 (ordem invertida), link de resposta fabricado à mão, uma chamada de API morta a cada pergunta de texto, dependência `axios` declarada e nunca usada. Pede escopo do **Drive inteiro sem usar para nada**. Sem testes, parado desde mai/2025. Licença GPL-3.0 (ver nota sobre licenças).

### masatoshi118/mcp_google_froms — prova de conceito de um dia

5 ferramentas, 2 tipos de pergunta, tudo em japonês (inclusive as descrições que chegam ao modelo), mesmos defeitos do anterior (posição 0 fixa, link fabricado, escopo Drive sem uso, `axios` morto) e **sem licença** — formalmente, ninguém pode reutilizar o código. 2 commits, ambos em 06/03/2025.

### ag2-mcp-servers/google-forms-api — o anti-exemplo

Gerado 100% automaticamente a partir da especificação OpenAPI da API do Google, sem revisão humana. Cobre nominalmente **toda** a API (todos os tipos de pergunta, watches, batch), mas só via JSON cru que o modelo teria de montar sozinho — e não funciona: o gerador não soube converter o esquema OAuth (**não existe caminho de configuração que autentique**) e o arquivo de configuração incluído aponta para a API do... 1Password (sobra de template). Cada ferramenta expõe ~11 parâmetros de ruído herdados da spec. É a demonstração perfeita de por que gerar um servidor MCP automaticamente, sem revisão, produz algo inutilizável.

## Tabela comparativa

| Aspecto | Nosso | MatthewWolff | udecode | KamaruSama | rishapgandhi | matteoantoci | masatoshi | ag2 |
|---|---|---|---|---|---|---|---|---|
| Ferramentas | 8 | 27 | 12 | 19 | 4 (Forms) | 5 | 5 | 9 cruas |
| Tipos de pergunta | 5 | **9** | 3 | 4 famílias | 5 | 2 | 2 | todos (JSON cru) |
| Publicar formulário (`set_publish`) | **sim** | não | não | não | não | não | não | não |
| Quiz com pontos e gabarito | **sim** | não | não | sim | não | não | não | JSON cru |
| Posicionar/mover perguntas | sim | sim | não (pos. 0 fixa) | sim | parcial | não (pos. 0 fixa) | não (pos. 0 fixa) | JSON cru |
| Editar pergunta existente | não | parcial | sim | sim | não | não | não | JSON cru |
| Criação em lote | não | **sim** | não | parcial | não | não | não | sim (crua) |
| Paginação de respostas | não | **sim** | não | não | não | não | não | sim (crua) |
| Seções / blocos de texto | não | sim | sim | parcial | não | não | não | JSON cru |
| Erros traduzidos e acionáveis | **sim** | parcial | não | não | não | não | não | não |
| Validação de entrada (zod/pydantic) | **sim** | sim | sim | parcial | não | não | não | de fachada |
| Escopos OAuth mínimos | **sim** | quase (drive.file) | não (Drive inteiro) | quase | não (12 escopos) | não (Drive inteiro) | não (Drive inteiro) | n/a |
| Testes / CI | não | **sim** | fracos/divergentes | não | não | não | não | de fachada |

## O que o estudo confirmou que fazemos bem

1. **`set_publish` é exclusividade nossa.** Nenhum dos 7 tem publicação — como todos pararam de evoluir antes da mudança do Google (30/06/2026: formulários criados via API nascem despublicados), um formulário criado por qualquer um deles hoje **não aceita respostas, e o usuário não descobre por quê**. Exatamente o achado 02 da nossa [revisão de código](revisao-de-codigo.md).
2. **Tratamento de erros amigável.** 6 dos 7 repassam o erro técnico cru do Google. A nossa camada de tradução (achado 07) não tem paralelo.
3. **Quiz de verdade.** Só o KamaruSama também suporta pontos e gabarito; o MatthewWolff, apesar das 27 ferramentas, só liga o modo quiz sem pontuar nada.
4. **Validação de posições.** Recusar apagar o que não é pergunta e conferir limites antes de chamar a API (achado 01) evita o defeito mais comum entre os estudados: agir sobre o item errado silenciosamente.
5. **Escopos mínimos.** 4 dos 7 pedem acesso ao Drive inteiro — 2 deles **sem usar o Drive para nada**. Pedimos apenas o necessário; manter assim.

## Melhorias recomendadas

Por ordem de prioridade. A coluna Status deve ser atualizada conforme a implementação avançar.

| # | Melhoria | Inspiração | Status |
|---|---|---|---|
| 1 | **Novos tipos de pergunta**: escala linear, data, hora e avaliação (estrelas/corações) | MatthewWolff | ✅ Concluído (10/07/2026) |
| 2 | **`build_form`**: criar o formulário inteiro (título, quiz, todas as perguntas) numa única operação — mais rápido, mais barato em tokens e sem estados intermediários | MatthewWolff (`build_form`) + KamaruSama (`batch_add`) | ✅ Concluído (10/07/2026) |
| 3 | **`get_form` resumido**: devolver resumo legível por padrão (o JSON completo só sob demanda) — economia de contexto | MatthewWolff (`get_form_summary`) + KamaruSama (`list_questions`) | ✅ Concluído (10/07/2026) |
| 4 | **Paginação em `list_responses`**: `pageSize`/`pageToken` para não estourar o contexto com formulários de muitas respostas (já era melhoria futura da revisão de código) | MatthewWolff | ✅ Concluído (10/07/2026) |
| 5 | **Editar o que já existe**: `update_form_info` (título/descrição do formulário) e `update_question` (enunciado, obrigatoriedade, alternativas, pontos) — hoje só apagando e recriando, o que perde o vínculo com respostas já recebidas (item menor 8 da revisão) | udecode + MatthewWolff | ✅ Concluído (10/07/2026) |
| 6 | **Seções e blocos de texto**: `add_section` (quebra de página) e `add_text_item` (texto explicativo) — o `get_form` e o `delete_question` já reconhecem esses itens; só não sabemos criá-los | MatthewWolff + udecode | ✅ Concluído (10/07/2026) |
| 7 | **`auth_status`**: diagnóstico das credenciais (arquivo existe? token válido?) — "termômetro" barato para quem está penando com o setup do OAuth | KamaruSama | ✅ Concluído (10/07/2026) |
| 8 | **`verify_answer_keys`**: conferir o gabarito de um quiz depois de criado, comparando com uma lista esperada — valioso quando quem monta o quiz é uma IA, que pode errar | KamaruSama | ✅ Concluído (10/07/2026) |
| 9 | **Preparação para publicar no npm**: aceitar credenciais por variável de ambiente ou pasta do usuário (hoje o caminho é relativo ao projeto, o que quebra quando instalado via npm/npx), remover `"private": true`, declarar os arquivos do pacote e conferir a disponibilidade do nome. O servidor já usa o SDK oficial (`@modelcontextprotocol/sdk`) — requisito principal cumprido desde o início. Publicação em si depende da conta npm do autor. | MatthewWolff (npm + MCP Registry) | Pendente |

**Ideias avaliadas e não adotadas (com razão):**

- **Watches/notificações Pub/Sub** (MatthewWolff, ag2) — exige criar tópico Pub/Sub no Google Cloud; inviável para o público do livro.
- **Analytics embutida** (MatthewWolff: frequência, tabulação cruzada, Sankey) — o Claude já analisa respostas bem sozinho; para um projeto didático é complexidade demais.
- **Listar/apagar formulários via Drive** (MatthewWolff, udecode) — exigiria escopo adicional (`drive.file` ou pior); contraria a decisão de escopos mínimos. O ganho não paga o custo.
- **`raw_batch_update`** (KamaruSama) — poderoso, mas permite ao modelo enviar qualquer operação destrutiva sem as validações que construímos; contraria o espírito das nossas guardas.
- **Compartilhar com e-mail específico** (rishapgandhi) — mesmo problema de escopo do Drive.

## Anti-padrões observados (o que evitar)

1. **Escopo além do necessário** — pedir o Drive inteiro para mexer em formulários (4 dos 7), às vezes sem nem usar. Em palavras simples: pedir a chave da casa inteira para mexer só na caixa de correio.
2. **Erro cru para o usuário** — repassar "invalid_grant" ou um 400 em inglês técnico sem dizer o que fazer (6 dos 7).
3. **Posição de inserção fixa em 0** — três projetos inserem toda pergunta no topo; a ordem sai invertida e a correção vira responsabilidade do modelo.
4. **Código gerado sem revisão** — o caso ag2: cobertura nominal completa, autenticação impossível, config de outro produto embarcada.
5. **Testes que não testam** — o udecode testa cópias das funções que divergem do código real; o ag2 roda um teste que sobe o servidor com zero ferramentas.
6. **Segredo em texto claro no config do cliente** — refresh token colado no `claude_desktop_config.json`/`.mcp.json` (4 projetos). O nosso arquivo local em `credentials/` (fora do git) não é perfeito, mas é mais contido.

## Nota sobre licenças

Cuidado ao **copiar código** (ideias e conceitos são livres; código tem dono):

- **MatthewWolff** e **udecode**: MIT — compatível com o nosso projeto (também MIT); código pode ser adaptado com atribuição.
- **matteoantoci**: GPL-3.0 — **incompatível** com MIT; não copiar código, só conceitos.
- **KamaruSama**: proprietária ("All rights reserved") — **não copiar código em hipótese alguma**; as ideias (`verify_answer_keys`, `auth_status`, lote) foram reimplementadas do zero.
- **masatoshi118**: sem licença — juridicamente, não copiável.

Todas as implementações derivadas deste estudo foram escritas do zero para este projeto, usando apenas os *conceitos* observados e a documentação oficial da API do Google Forms.
