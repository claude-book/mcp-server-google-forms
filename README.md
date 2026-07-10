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
- `delete_question` — remove a pergunta na posição indicada (recusa apagar o que não for pergunta).
- `move_question` — move um item de uma posição para outra.
- `list_responses` — lista as respostas, incluindo perguntas de upload de arquivo. Em páginas (padrão 50),
  com `pageSize`/`pageToken` para formulários com muitas respostas.

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

## Arquivos sensíveis

Tudo em `credentials/` guarda segredos — a pasta inteira está no `.gitignore` e nunca deve ser commitada.

## Licença

[MIT](LICENSE)
