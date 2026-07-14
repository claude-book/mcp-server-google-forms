# mcp-server-google-forms

[![npm](https://img.shields.io/npm/v/mcp-server-google-forms?label=npm&color=cb3837)](https://www.npmjs.com/package/mcp-server-google-forms)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.claude--book-6d3fc0)](https://registry.modelcontextprotocol.io/?q=mcp-server-google-forms)
[![DOI](https://zenodo.org/badge/1294358395.svg)](https://doi.org/10.5281/zenodo.21296975)

Servidor MCP local que permite ao Claude Code **criar, editar e publicar Google Forms**.
Código de exemplo do livro sobre Claude Code — instale pelo npm (ou clone), autorize com a sua conta Google e use.

> **Nunca mexeu com terminal? Sem problema.** O passo a passo abaixo foi escrito para quem **não programa**:
> é só copiar e colar os comandos. Você faz esta configuração **uma única vez**; depois, é só conversar com o Claude.

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

---

## Antes de começar (o que você precisa ter)

1. **Node.js 18 ou mais novo.** É o programa que faz o servidor rodar; os comandos `npm` e `npx` vêm junto com ele.
   - Para conferir se já tem, abra o terminal (veja abaixo) e digite `node --version`. Se aparecer algo como
     `v18.0.0` ou maior, está pronto. Se der "comando não encontrado", baixe a versão **LTS** em
     [nodejs.org](https://nodejs.org) e instale (é só avançar/próximo).
2. **O Claude Code instalado** — é por ele que você vai conversar com o servidor. Instruções em
   [code.claude.com/docs](https://code.claude.com/docs).
3. **Uma conta Google** (a mesma em que os formulários vão aparecer).

**Como abrir o terminal** (é onde você cola os comandos):
- **Mac:** aperte `Cmd + Espaço`, digite *Terminal* e dê Enter.
- **Windows:** menu Iniciar → digite *PowerShell* → abra o **Windows PowerShell**.
- **Linux:** procure por *Terminal* no menu de aplicativos (ou `Ctrl + Alt + T`).

---

## Passo 1 — Preparar o Google Cloud (uma vez)

Isto autoriza o servidor a falar com o Google Forms **em seu nome**. Parece longo, mas você faz só uma vez.
Acesse [console.cloud.google.com](https://console.cloud.google.com) e faça login com a sua conta Google.

1. **Crie um projeto.** No topo da página, clique no seletor de projetos → **Novo projeto** → dê um nome
   (ex.: `meus-forms`) → **Criar**. Depois, confira que ele está selecionado no topo.
2. **Ative a Google Forms API.** Na barra de busca do topo, procure por **Google Forms API**, abra o resultado
   e clique em **Ativar**.
3. **Configure a tela de permissão.** No menu (☰) → **APIs e serviços** → **Tela de permissão OAuth**.
   Escolha o tipo **Externo** → **Criar**. Preencha o **nome do app** (ex.: `Meus Forms`), o **e-mail de suporte**
   e o **e-mail de contato do desenvolvedor** (pode ser o seu mesmo) → salve avançando as telas.
4. **Adicione-se como usuário de teste — este é o passo que mais gente esquece.** Ainda na Tela de permissão,
   na seção **Usuários de teste**, clique em **Adicionar usuários** e coloque **o seu próprio e-mail do Google**.
   Sem isso, o Google recusa a autorização com "acesso negado".
5. **Crie a credencial.** No menu → **APIs e serviços** → **Credenciais** → **Criar credenciais** →
   **ID do cliente OAuth** → em "Tipo de aplicativo" escolha **App para computador** → **Criar**.
6. **Baixe o arquivo.** Na janela que aparece (ou no ícone de download ⬇ ao lado da credencial), clique em
   **Fazer download do JSON**. Esse é o seu `client_secret*.json`. Guarde-o — você vai usá-lo no Passo 2.

---

## Passo 2 — Instalar e autorizar

Escolha **um** dos dois caminhos. O **Caminho A** é o mais simples e não exige baixar o código.

### Caminho A — via npm (recomendado, sem clonar nada)

1. **Rode o comando de autorização uma primeira vez.** Ele ainda vai falhar de propósito — mas já cria a pasta
   certa e mostra o caminho dela. No terminal, cole:
   ```
   npx -p mcp-server-google-forms mcp-server-google-forms-token
   ```
   Vai aparecer uma mensagem como *"Não encontrei nenhum 'client_secret*.json' em …/.config/mcp-server-google-forms"*.
   Anote (ou copie) esse caminho — é para lá que vai o arquivo.
2. **Coloque o `client_secret*.json` naquela pasta.** Ela é oculta, então use o atalho de "ir para a pasta":
   - **Mac:** no Finder, `Cmd + Shift + G`, cole `~/.config/mcp-server-google-forms` e dê Enter. Arraste o arquivo para lá.
   - **Windows:** no Explorer, clique na barra de endereço, cole `%USERPROFILE%\.config\mcp-server-google-forms` e dê Enter.
   - **Linux:** no gerenciador de arquivos, `Ctrl + L`, cole `~/.config/mcp-server-google-forms` e dê Enter.
3. **Rode o mesmo comando de novo.** Agora o navegador abre sozinho:
   ```
   npx -p mcp-server-google-forms mcp-server-google-forms-token
   ```
   - Escolha a sua conta Google.
   - Vai aparecer a tela **"O Google não verificou este app"**. Isso é **normal** (o app é seu e está em modo de teste).
     Clique em **Avançado** → **Acessar Meus Forms (não seguro)**. Pode confiar: é o seu próprio app, rodando na sua máquina.
   - Confirme as permissões. No terminal aparece *"Pronto. refreshToken salvo…"* — deu certo.
4. **Registre no Claude Code:**
   ```
   claude mcp add google-forms -- npx mcp-server-google-forms
   ```

### Caminho B — via clone do repositório (para quem for mexer no código)

1. **Clone e instale:**
   ```
   git clone https://github.com/claude-book/mcp-server-google-forms.git
   cd mcp-server-google-forms
   npm install
   ```
2. **Coloque o `client_secret*.json`** na pasta `credentials/` dentro do projeto (crie-a se não existir).
3. **Autorize:** rode `npm run token` e aprove no navegador (mesma tela do Google descrita no Caminho A,
   incluindo o aviso de "app não verificado"). Isso gera `credentials/config.json`.
4. **Registre no Claude Code** (rodando na raiz do projeto):
   ```
   claude mcp add google-forms -- node "$(pwd)/src/server.js"
   ```

---

## Passo 3 — Peça ao Claude

Pronto! Abra o Claude Code e peça em português, por exemplo:

> *"Crie um quiz de 5 perguntas sobre fotossíntese, valendo 2 pontos cada, e me dê o link para compartilhar."*

Fluxo típico: `build_form` (ou `create_form` → `add_question`) → compartilhar o link de resposta → `list_responses`.

> **Sobre publicação:** verificamos na prática (10/07/2026) que a API cria formulários **já publicados** por padrão,
> ao contrário do que a documentação do Google sugeria. Por isso as ferramentas de criação aceitam `unpublished=true`
> (criar como rascunho) e **informam o estado real** devolvido pela API — e o `set_publish` cobre os dois sentidos.

---

## Solução de problemas

- **"O Google não verificou este app"** (tela laranja durante a autorização) — é esperado enquanto o seu app OAuth
  está em modo **Testing**. Clique em **Avançado** → **Acessar … (não seguro)**. É o seu próprio app; não há risco.
- **"Acesso negado" / `access_denied` ao autorizar** — quase sempre é porque você **não se adicionou como usuário de teste**
  (Passo 1.4). Volte à Tela de permissão OAuth, adicione o seu e-mail em **Usuários de teste** e tente de novo.
- **"Credenciais expiradas ou revogadas"** — rode o comando de autorização de novo (`npm run token` no clone, ou
  `npx -p mcp-server-google-forms mcp-server-google-forms-token` no npm) e repita; o servidor recarrega as credenciais
  sozinho, sem precisar reiniciar. Importante: enquanto o app OAuth estiver em modo **Testing** no Google Cloud, o Google
  expira a autorização a cada **7 dias**. Para tokens duradouros, publique o app (Tela de permissão OAuth → **In production**).
- **O Google não enviou o refresh token** — se a mensagem pedir, remova o acesso deste app em
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions) e rode a autorização mais uma vez.

Para um diagnóstico rápido, peça ao Claude para rodar a ferramenta `auth_status`: ela testa as credenciais direto com o Google.

## Estrutura da pasta

```
src/server.js          → o servidor MCP
scripts/get-token.js   → autorização OAuth (rodar uma vez)
credentials/           → segredos locais (client_secret*.json e config.json) — fora do git
docs/                  → revisão de código e histórico de alterações
```

## Documentação

- [Página do projeto](https://claude-book.github.io/mcp-server-google-forms/) — apresentação, [política de privacidade](https://claude-book.github.io/mcp-server-google-forms/privacidade.html) e [termos de uso](https://claude-book.github.io/mcp-server-google-forms/termos.html).
- [Revisão de código](docs/revisao-de-codigo.md) — problemas conhecidos, gravidade, status das correções e histórico de alterações com as razões de cada mudança.
- [Estudo de MCPs similares](docs/estudo-de-mcps-similares.md) — comparação com 7 servidores MCP para Google Forms do GitHub, melhorias adotadas e anti-padrões a evitar.
- [Versão em HTML](docs/revisao-de-codigo.html) — o mesmo relatório em formato amigável para não-programadores (abra no navegador).

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
