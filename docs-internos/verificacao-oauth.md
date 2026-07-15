# Verificação do app OAuth — Modelo B

> **Documento de trabalho interno.** Não é publicado no site (está fora da pasta `docs/`).
> **Objetivo:** verificar **um** app OAuth do Henrique para que a comunidade de professores
> use o MCP **sem** o aviso de "app não verificado" e **sem** precisar mexer no Google Cloud.

---

## ⏳ O que FALTA fazer

**Agora (só o Henrique):**

1. [ ] **Gravar o vídeo** de verificação e subir no YouTube como **"Não listado"**. Roteiro pronto no **Apêndice B**.
2. [ ] No **Verification Center**, colar a **justificativa** (Apêndice A), o **link do vídeo** e **enviar para verificação**.
3. [ ] **Aguardar o Google** (dias a semanas) e responder eventuais e-mails pedindo ajustes.

**Depois que a verificação for APROVADA (frente final do Modelo B — Henrique + IA):**

4. [ ] **Código:** embutir a credencial compartilhada (client_id + client_secret) no pacote, para o professor **não precisar baixar nada** do Google Cloud. Mexe em `scripts/get-token.js` e `src/credentials-dir.js`.
5. [ ] **Manual:** remover o **Passo 1 (Google Cloud)** do fluxo do professor (vira: instalar → login → `claude mcp add`). Passo 1 vira um apêndice "para quem quer usar o próprio projeto".

---

## ✅ O que JÁ foi feito

- [x] App em **Produção** (publicado).
- [x] Henrique **autorizou para si** (funcionando no Mac e no Windows).
- [x] **Domínio** `henriquealvarenga.com` verificado no Google Search Console.
- [x] **Páginas no ar** em `https://henriquealvarenga.com/mcp/` (repo `henriquealvarenga/mcp`): início, privacidade e termos.
- [x] **Política de privacidade** com a seção *Limited Use*.
- [x] **Branding verificada** (nome "Formulários para Claude" + logo).
- [x] **Tela de permissão (Branding)** preenchida: nome, 3 URLs, domínio autorizado e contato.
- [x] **Escopos declarados** na página **Data Access**: `forms.body`, `forms.responses.readonly`, `drive.file`.
- [x] **Justificativa dos escopos** pronta (Apêndice A).
- [x] **Roteiro do vídeo** pronto (Apêndice B).

---

## Dados do projeto (referência rápida)

| Item | Valor |
| --- | --- |
| Projeto Google Cloud | `claude-forms-mcp-501013` |
| Nome do app | Formulários para Claude |
| Client ID (Desktop) | `384478266631-l2mnd0dcsq6oiom7t9jsp0u47ppbp7hj.apps.googleusercontent.com` |
| Domínio | `henriquealvarenga.com` |
| Página inicial | `https://henriquealvarenga.com/mcp/` |
| Privacidade | `https://henriquealvarenga.com/mcp/privacidade.html` |
| Termos | `https://henriquealvarenga.com/mcp/termos.html` |
| Escopos | `forms.body` (sensível), `forms.responses.readonly` (sensível), `drive.file` (não-sensível) |

Como os escopos são **sensíveis** (não "restritos"), é a verificação **mais leve** — **sem** auditoria de segurança externa (CASA).

---

## Por que Modelo B (resumo da decisão)

- **Uma credencial OAuth única**, verificada pelo Henrique, embutida no pacote e compartilhada por todos.
- Cada professor faz login com **a própria conta** → os formulários e dados ficam **na conta dele**.
- O Henrique **nunca** vê senhas, tokens ou dados: o MCP roda na máquina de cada um. A credencial só empresta a "identidade verificada" do app.
- Como o cliente é do tipo **Desktop**, o Google trata o `client_secret` como **não-secreto**; distribuí-lo junto é aceitável (mesmo modelo do rclone, gcloud).
- O aviso "app não verificado" depende do **app**, não da conta — por isso só some com **uma** credencial verificada compartilhada.

---

## Pegadinhas que descobrimos (para não esquecer)

- **"Verification not required" enganoso:** aparecia porque a página **Data Access estava vazia**. Os escopos eram pedidos só em tempo de execução, sem estar declarados. **Declarar** os escopos ali é o que faz a verificação passar a ser exigida.
- **`github.io` não vale** como domínio autorizado no OAuth — por isso usamos `henriquealvarenga.com`.
- O Google **não deixa rebaixar o `client_secret`** depois de criado (nem vê-lo de novo). Guardar o arquivo ou copiar a pasta de credenciais.
- Verificar o domínio no Search Console: já estava feito (propriedade `sc-domain:henriquealvarenga.com`).

---

## Apêndice A — Justificativa dos escopos (campo único, ≤ 1000 caracteres)

> O aplicativo "Formulários para Claude" roda localmente no computador do usuário e conecta o assistente Claude à API oficial do Google Forms. A pedido do próprio usuário, ele cria e edita formulários (forms.body) e lê as respostas dos formulários do próprio usuário (forms.responses.readonly, somente leitura) — funções voltadas a professores que montam quizzes e formulários. São os escopos mínimos necessários para isso. Não há servidores do desenvolvedor: os dados trafegam diretamente entre o computador do usuário e o Google, não são armazenados nem compartilhados por nós, e o uso obedece à Política de Dados do Usuário dos Serviços de API do Google, incluindo o Uso Limitado.

Versões curtas, caso o formulário tenha um campo por escopo:

- **forms.body:** Criar e editar formulários (título, perguntas, seções, quiz) a pedido do usuário. Escopo mínimo para a função principal do app; não acessa o Drive inteiro nem outros dados.
- **forms.responses.readonly:** Ler, somente leitura, as respostas dos formulários do próprio usuário (ex.: professor conferindo um quiz). Não modifica nem acessa dados de terceiros.
- **drive.file:** Acesso apenas aos arquivos criados pelo próprio app (não ao Drive inteiro), para as operações do Forms.

---

## Apêndice B — Roteiro do vídeo de verificação

**Requisitos do Google:** mostrar o **processo de concessão (OAuth grant)**, os **detalhes do app** (nome e Client ID) e **como cada escopo sensível é usado**.

**Dicas:** duração ~2–4 min; pode ser só gravação de tela com **legendas** (não precisa aparecer nem falar); **idioma recomendado: inglês** (ou legendas em inglês); deixar a **URL do consentimento visível** (mostra o `client_id`).

- **Cena 1 — Identidade do app (~15s):** mostrar Google Cloud → Clients (Client ID) e Branding (nome).
  > *Legenda:* "App: Formulários para Claude (project claude-forms-mcp). OAuth client ID: 384478266631-…apps.googleusercontent.com. A local MCP server that lets the Claude assistant create and edit the user's own Google Forms."
- **Cena 2 — OAuth grant (~45s):** terminal rodando `npx -p mcp-server-google-forms mcp-server-google-forms-token`; navegador abre o consentimento (URL com client_id visível); escolher conta e conceder.
  > *Legenda:* "The user runs the authorization command. The Google consent screen opens — note the client ID in the URL. The user selects their account and grants the requested scopes."
- **Cena 3 — Uso do forms.body (~40s):** no Claude, pedir "crie um quiz de 3 perguntas sobre matemática"; mostrar o formulário criado no Google Forms.
  > *Legenda:* "The forms.body scope is used to create and edit the form — title, questions and quiz answer keys — at the user's request."
- **Cena 4 — Uso do forms.responses.readonly (~30s):** responder ao formulário antes (para ter 1 resposta); no Claude, pedir "liste as respostas deste formulário"; mostrar as respostas.
  > *Legenda:* "The forms.responses.readonly scope is used to read, read-only, the responses of the user's own forms."
- **Cena 5 — Encerramento (~10s):**
  > *Legenda:* "All data flows directly between the user's computer and Google. There is no developer server; use complies with the Google API Services User Data Policy, including Limited Use."

Depois: subir no YouTube como **Não listado (Unlisted)** e colar o link no formulário de verificação.
