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
- `build_form` — cria o formulário **inteiro numa única operação**: título, descrição, modo quiz e todas as perguntas.
- `set_publish` — publica ou despublica o formulário (necessário para receber respostas).
- `get_form` — mostra a lista de itens com as posições e a estrutura completa.
- `add_question` — acrescenta uma pergunta (no final ou numa posição indicada). Nove tipos: texto curto/longo,
  escolha única, caixas de seleção, lista suspensa, escala linear, data, hora/duração e avaliação (estrelas, corações ou joinhas).
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

## Arquivos sensíveis

Tudo em `credentials/` guarda segredos — a pasta inteira está no `.gitignore` e nunca deve ser commitada.

## Licença

[MIT](LICENSE)
