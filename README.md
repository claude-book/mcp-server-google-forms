# mcp-server-google-forms

Servidor MCP local que permite ao Claude Code **criar, editar e publicar Google Forms**.
Código de exemplo do livro sobre Claude Code — clone, autorize com a sua conta Google e use.

## Estrutura da pasta

```
src/server.js          → o servidor MCP
scripts/get-token.js   → autorização OAuth (rodar uma vez)
credentials/           → segredos locais (client_secret*.json e config.json) — fora do git
docs/                  → revisão de código e histórico de alterações
```

## Ferramentas expostas

- `create_form` — cria um formulário (nasce **não publicado**) e devolve o ID e os links.
- `set_publish` — publica ou despublica o formulário (necessário para receber respostas).
- `get_form` — mostra a lista de itens com as posições e a estrutura completa.
- `add_question` — acrescenta uma pergunta (no final ou numa posição indicada).
- `set_quiz` — liga ou desliga o modo quiz (com notas). Obrigatório antes de usar `points`.
- `delete_question` — remove a pergunta na posição indicada (recusa apagar o que não for pergunta).
- `move_question` — move um item de uma posição para outra.
- `list_responses` — lista as respostas, incluindo perguntas de upload de arquivo.

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

`create_form` → `add_question` (com `set_quiz` antes, se houver pontos) → `set_publish` → compartilhar o link → `list_responses`.

> Desde 30/06/2026, formulários criados via API nascem **não publicados** — por isso o passo `set_publish`.

## Documentação

- [Revisão de código](docs/revisao-de-codigo.md) — problemas conhecidos, gravidade, status das correções e histórico de alterações com as razões de cada mudança.
- [Versão em HTML](docs/revisao-de-codigo.html) — o mesmo relatório em formato amigável para não-programadores (abra no navegador).

## Arquivos sensíveis

Tudo em `credentials/` guarda segredos — a pasta inteira está no `.gitignore` e nunca deve ser commitada.

## Licença

[MIT](LICENSE)
