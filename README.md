# mcp-server-google-forms

[![npm](https://img.shields.io/npm/v/mcp-server-google-forms?label=npm&color=cb3837)](https://www.npmjs.com/package/mcp-server-google-forms)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.claude--book-6d3fc0)](https://registry.modelcontextprotocol.io/?q=mcp-server-google-forms)
[![DOI](https://zenodo.org/badge/1294358395.svg)](https://doi.org/10.5281/zenodo.21296975)

Servidor MCP local que permite ao Claude Code **criar, editar e publicar Google Forms**.
Código de exemplo do livro sobre Claude Code — instale pelo npm (ou clone), autorize com a sua conta Google e use.

## Estrutura da pasta

```
src/server.js          → o servidor MCP
scripts/get-token.js   → autorização OAuth (rodar uma vez)
credentials/           → segredos locais (client_secret*.json e config.json) — fora do git
docs/                  → revisão de código e histórico de alterações
```

## Ferramentas expostas

- `create_form` — cria um formulário e devolve o ID e os links. Por padrão o Google o cria **já publicado**;
  use `unpublished=true` para criar como rascunho. A resposta informa o estado real.
- `build_form` — cria o formulário **inteiro numa única operação**: título, descrição, modo quiz e todas as perguntas.
- `set_publish` — publica ou despublica o formulário (libera ou bloqueia respostas).
- `get_form` — mostra a lista de itens com as posições e a estrutura completa.
- `add_question` — acrescenta uma pergunta (no final ou numa posição indicada). Nove tipos: texto curto/longo,
  escolha única, caixas de seleção, lista suspensa, escala linear, data, hora/duração e avaliação (estrelas, corações ou joinhas).
- `update_form_info` — altera o título e/ou a descrição de um formulário existente.
- `update_question` — edita uma pergunta existente (enunciado, obrigatoriedade, alternativas, pontos, gabarito)
  sem apagar e recriar — preserva o vínculo com respostas já recebidas.
- `set_quiz` — liga ou desliga o modo quiz (com notas). Obrigatório antes de usar `points`.
- `add_section` — insere uma quebra de seção (nova página) na posição indicada.
- `add_text_item` — insere um bloco de texto explicativo (sem campo de resposta) na posição indicada.
- `delete_question` — remove a pergunta na posição indicada (recusa apagar o que não for pergunta).
- `move_question` — move um item de uma posição para outra.
- `list_responses` — lista as respostas, incluindo perguntas de upload de arquivo. Em páginas (padrão 50),
  com `pageSize`/`pageToken` para formulários com muitas respostas.
- `verify_answer_keys` — confere o gabarito de um quiz contra uma lista esperada (auditoria pós-criação).
- `auth_status` — diagnóstico das credenciais: arquivo presente, campos completos e teste real com o Google.

## Como usar (uma vez)

1. **Clone e instale:**
   ```
   git clone https://github.com/claude-book/mcp-server-google-forms.git
   cd mcp-server-google-forms
   npm install
   ```
2. **No Google Cloud** ([console.cloud.google.com](https://console.cloud.google.com)): crie um projeto,
   **ative a Google Forms API**, crie credenciais OAuth do tipo **App para computador** e baixe o
   arquivo `client_secret*.json`. Coloque-o na pasta `credentials/` (crie-a se não existir).
3. **Autorize:** rode `npm run token` e aprove no navegador. Isso gera `credentials/config.json`.
4. **Registre no Claude Code** (rodando na raiz do projeto):
   ```
   claude mcp add google-forms -- node "$(pwd)/src/server.js"
   ```

## Fluxo típico

`build_form` (ou `create_form` → `add_question`) → compartilhar o link de resposta → `list_responses`.

> **Sobre publicação:** verificamos na prática (10/07/2026) que a API cria formulários **já publicados** por padrão,
> ao contrário do que a documentação do Google sugeria. Por isso as ferramentas de criação aceitam `unpublished=true`
> (criar como rascunho) e **informam o estado real** devolvido pela API — e o `set_publish` cobre os dois sentidos.

## Solução de problemas

- **"Credenciais expiradas ou revogadas"** — rode `npm run token` de novo e repita o comando; o servidor
  recarrega as credenciais sozinho, sem precisar reiniciar. Importante: enquanto o app OAuth estiver em modo
  **Testing** no Google Cloud, o Google expira a autorização a cada **7 dias**. Para tokens duradouros,
  publique o app (tela de permissão OAuth → **In production**).

## Documentação

- [Página do projeto](https://claude-book.github.io/mcp-server-google-forms/) — apresentação, [política de privacidade](https://claude-book.github.io/mcp-server-google-forms/privacidade.html) e [termos de uso](https://claude-book.github.io/mcp-server-google-forms/termos.html).
- [Revisão de código](docs/revisao-de-codigo.md) — problemas conhecidos, gravidade, status das correções e histórico de alterações com as razões de cada mudança.
- [Estudo de MCPs similares](docs/estudo-de-mcps-similares.md) — comparação com 7 servidores MCP para Google Forms do GitHub, melhorias adotadas e anti-padrões a evitar.
- [Versão em HTML](docs/revisao-de-codigo.html) — o mesmo relatório em formato amigável para não-programadores (abra no navegador).

## Instalação via npm (alternativa ao clone)

Com o pacote publicado no npm, dá para pular o clone:

1. Baixe o `client_secret*.json` do Google Cloud (passo 2 acima) e coloque-o em `~/.config/mcp-server-google-forms/` (crie a pasta).
2. Autorize: `npx -p mcp-server-google-forms mcp-server-google-forms-token`
3. Registre no Claude Code: `claude mcp add google-forms -- npx mcp-server-google-forms`

## Onde ficam as credenciais

O servidor e o script de autorização procuram as credenciais nesta ordem:

1. Na pasta definida pela variável de ambiente `GOOGLE_FORMS_MCP_DIR`, se houver;
2. Em `credentials/` dentro do projeto, se a pasta existir (instalação por clone);
3. Em `~/.config/mcp-server-google-forms/` (instalação via npm/npx).

## Arquivos sensíveis

Tudo na pasta de credenciais guarda segredos — no caso do clone, a pasta `credentials/` inteira está no
`.gitignore` e nunca deve ser commitada. O pacote npm é gerado só com `src/` e `scripts/` (campo `files`
do `package.json`), então credenciais jamais entram no pacote.

## Citação

Este software tem DOI permanente (arquivado no [Zenodo](https://doi.org/10.5281/zenodo.21296975) a cada release; metadados em [CITATION.cff](CITATION.cff)):

> Alvarenga da Silva, H. (2026). *mcp-server-google-forms: servidor MCP para Google Forms*. Zenodo. https://doi.org/10.5281/zenodo.21296975

## Licença

[MIT](LICENSE)
