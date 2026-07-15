# Verificação do app OAuth — plano (Modelo B)

> Documento de trabalho interno. **Não** é publicado no site (está fora da pasta `docs/`).
> Objetivo: preparar a verificação do app OAuth no Google para que **a comunidade de professores**
> use o MCP **sem** ver o aviso de "app não verificado" e **sem** precisar mexer no Google Cloud.

## Contexto / decisão

Queremos que muitos professores (não-programadores) usem o MCP. Escolhemos o **Modelo B**:

- **Uma credencial OAuth única**, verificada pelo Henrique, **embutida** no pacote e compartilhada por todos.
- Cada professor faz login com **a própria conta Google** → os formulários e os dados ficam **na conta dele**.
- O Henrique **nunca** vê senhas, tokens ou dados: o MCP roda na máquina de cada um; o token fica no disco de cada um. A credencial compartilhada só empresta a "identidade verificada" do app.
- Como o cliente é do tipo **App para computador (Desktop)**, o Google trata o `client_secret` como **não-secreto**, então distribuí-lo junto com o pacote é aceitável (mesmo modelo do rclone, gcloud, etc.).

Por que o aviso some só assim: o aviso "app não verificado" depende do **app** (a credencial), não da conta. Se cada um criar a própria credencial, cada um teria um app não verificado. Uma credencial única **verificada** remove o aviso para todos.

## Estado atual (jul/2026)

- [x] App em **Produção** (publicado).
- [x] Henrique já autorizou para si mesmo (setup pessoal funcionando no Mac e no Windows).
- [x] **Domínio `henriquealvarenga.com` já verificado** no Search Console (propriedade `sc-domain:` — verificação de domínio completa, a que o OAuth exige).
- [x] **Páginas home/privacidade/termos prontas** (arquivos entregues; ver "Nome do app e URLs" abaixo). Falta o Henrique **subir no repo `henriquealvarenga/mcp` e ligar o GitHub Pages**.
- [ ] Verificação **ainda não enviada**.

## Nome do app e URLs (decididos)

- **Nome público do app:** **"Formulários para Claude"** (evita "Google" no nome). Deve ser **o mesmo** na Tela de permissão OAuth.
- **Páginas** hospedadas no repo `henriquealvarenga/mcp` → servidas em:
  - Página inicial: `https://henriquealvarenga.com/mcp/`
  - Política de privacidade: `https://henriquealvarenga.com/mcp/privacidade.html`
  - Termos: `https://henriquealvarenga.com/mcp/termos.html`

## Dados úteis do projeto

- **Projeto Google Cloud:** `claude-forms-mcp-501013`
- **Domínio próprio (usar na verificação):** `henriquealvarenga.com`
- **Escopos usados** (ver `scripts/get-token.js`):
  - `https://www.googleapis.com/auth/forms.body` — **sensível** (criar/editar formulários)
  - `https://www.googleapis.com/auth/forms.responses.readonly` — **sensível** (ler respostas)
  - `https://www.googleapis.com/auth/drive.file` — **não-sensível** (acesso só aos arquivos criados pelo app)
- Como os escopos são **sensíveis** (não "restritos"), é a verificação **mais leve**: **sem** auditoria de segurança externa (CASA).

---

## Checklist da verificação

### Etapa 1 — Domínio próprio e páginas
O Google **não aceita `github.io`** como domínio autorizado. Usar `henriquealvarenga.com`.
- [x] Verificar a posse de `henriquealvarenga.com` no [Google Search Console](https://search.google.com/search-console) — **feito** (propriedade `sc-domain:henriquealvarenga.com`).
- [~] Hospedar no domínio próprio, públicas: **página inicial**, **política de privacidade** e **termos de uso**. → **Arquivos prontos e entregues** (repo `henriquealvarenga/mcp`). Falta o Henrique subir os 4 arquivos (`index.html`, `privacidade.html`, `termos.html`, `styles.css`) e ligar o **Settings → Pages → branch `main` / root**.

### Etapa 2 — Tela de permissão OAuth
Google Cloud → **APIs e serviços → Tela de permissão OAuth** (Branding/Público):
- [ ] **Nome do app** (aparece para os professores; claro e **sem** usar a marca "Google" indevidamente — ex.: "Formulários para Claude" ou "MCP Forms").
- [ ] **E-mail de suporte** e **e-mail do desenvolvedor**.
- [ ] URLs de **página inicial**, **política de privacidade** e **termos** no `henriquealvarenga.com`.
- [ ] **Domínios autorizados:** `henriquealvarenga.com`.
- [ ] **Logo (opcional):** se subir, passa por revisão de marca à parte que **pode atrasar**. Pode verificar sem logo primeiro.

### Etapa 3 — Escopos e justificativas
- [ ] Confirmar os escopos (acima).
- [ ] Escrever a justificativa de cada escopo sensível (o quê + por quê + como). → *texto a produzir (ver abaixo)*

### Etapa 4 — Vídeo de demonstração (YouTube, pode ser "não listado")
- [ ] Mostrar a **tela de consentimento** real, com o **client_id na URL**.
- [ ] Mostrar o app **usando cada escopo** (criar formulário, ler respostas). → *roteiro a produzir (ver abaixo)*

### Etapa 5 — Enviar e acompanhar
- [ ] Em **Verification Center / Preparar para verificação**, preencher e **enviar**.
- [ ] Acompanhar o **e-mail** do Google (costumam pedir ajustes; responder rápido acelera). Prazo típico: **dias a algumas semanas**.

---

## O que a IA (Claude) vai produzir para o Henrique

Itens de escrita:

1. [x] **Justificativas dos escopos** — prontas (ver Apêndice A).
2. [x] **Política de privacidade** — feita (arquivo `privacidade.html` entregue, com a seção *Limited Use*).
3. [x] **Roteiro do vídeo** de demonstração — pronto (ver Apêndice B).
4. [x] **Página inicial** descrevendo o app — feita (`index.html`).

Todos os textos da IA estão prontos. Falta o Henrique **gravar o vídeo** e **enviar a verificação**.

## Outras frentes do Modelo B (depois da verificação aprovada)

Estas não fazem parte da verificação, mas completam o Modelo B — só "virar a chave" quando a verificação sair:

- [ ] **Código/pacote:** embutir a credencial compartilhada (client_id + client_secret) como padrão, para o professor **não precisar baixar nada** do Google Cloud. Mexe em `scripts/get-token.js` / `src/credentials-dir.js`.
- [ ] **Manual:** remover o **Passo 1 (Google Cloud)** do fluxo do professor (vira: instalar → rodar o comando → login → `claude mcp add`). Guardar o Passo 1 num apêndice "para quem quer usar o próprio projeto".

## Onde retomar

Feito até aqui:
- Domínio verificado; páginas (home/privacidade/termos) **no ar** em `https://henriquealvarenga.com/mcp/`.
- Branding **verificada** (nome + logo).
- Tela de permissão (Branding) preenchida com nome, URLs e domínio autorizado.
- Escopos **adicionados** na página **Data Access** (`forms.body`, `forms.responses.readonly`, `drive.file`) — os dois de Forms como sensíveis.
- Justificativa (Apêndice A) e roteiro do vídeo (Apêndice B) prontos.

> Descoberta importante: o Verification Center dizia "verification not required" **porque a página Data Access estava vazia** — os escopos eram pedidos só em tempo de execução, sem estar declarados. Ao declará-los ali, a verificação passa a ser exigida.

Próximos passos, na ordem:
1. **Henrique:** gravar o **vídeo** (Apêndice B), subir no YouTube como "Não listado".
2. **Henrique:** no **Verification Center**, preencher a justificativa (Apêndice A, campo único de 1000 caracteres), colar o link do vídeo e **enviar para verificação**.
3. Aguardar o Google (dias a semanas; responder e-mails de ajuste).
4. **Depois de aprovado:** partir para as "Outras frentes do Modelo B" (código com credencial embutida + manual sem o Passo 1).

---

## Apêndice A — Justificativa dos escopos (campo único, ≤ 1000 caracteres)

> O aplicativo "Formulários para Claude" roda localmente no computador do usuário e conecta o assistente Claude à API oficial do Google Forms. A pedido do próprio usuário, ele cria e edita formulários (forms.body) e lê as respostas dos formulários do próprio usuário (forms.responses.readonly, somente leitura) — funções voltadas a professores que montam quizzes e formulários. São os escopos mínimos necessários para isso. Não há servidores do desenvolvedor: os dados trafegam diretamente entre o computador do usuário e o Google, não são armazenados nem compartilhados por nós, e o uso obedece à Política de Dados do Usuário dos Serviços de API do Google, incluindo o Uso Limitado.

Versões curtas, caso o formulário tenha um campo por escopo:
- **forms.body:** Criar e editar formulários (título, perguntas, seções, quiz) a pedido do usuário. Escopo mínimo para a função principal do app; não acessa o Drive inteiro nem outros dados.
- **forms.responses.readonly:** Ler, somente leitura, as respostas dos formulários do próprio usuário (ex.: professor conferindo um quiz). Não modifica nem acessa dados de terceiros.
- **drive.file:** Acesso apenas aos arquivos criados pelo próprio app (não ao Drive inteiro), para as operações do Forms.

## Apêndice B — Roteiro do vídeo de verificação

Requisitos do Google: mostrar o **processo de concessão (OAuth grant)**, os **detalhes do app** (nome e Client ID) e **como cada escopo sensível é usado**. Duração ~2–4 min. Pode ser só gravação de tela com legendas (não precisa aparecer nem falar). **Idioma recomendado: inglês** (ou legendas em inglês). Deixar a **URL do consentimento visível** (mostra o `client_id`).

Client ID: `384478266631-l2mnd0dcsq6oiom7t9jsp0u47ppbp7hj.apps.googleusercontent.com`

- **Cena 1 — Identidade do app (~15s):** mostrar Google Cloud → Clients (Client ID) e Branding (nome). Legenda: *"App: Formulários para Claude (project claude-forms-mcp). OAuth client ID: 384478266631-…apps.googleusercontent.com. A local MCP server that lets the Claude assistant create and edit the user's own Google Forms."*
- **Cena 2 — OAuth grant (~45s):** terminal rodando `npx -p mcp-server-google-forms mcp-server-google-forms-token`; navegador abre o consentimento (URL com client_id visível); escolher conta e conceder. Legenda: *"The user runs the authorization command. The Google consent screen opens — note the client ID in the URL. The user selects their account and grants the requested scopes."*
- **Cena 3 — Uso do forms.body (~40s):** no Claude, pedir "crie um quiz de 3 perguntas sobre matemática"; mostrar o formulário criado no Google Forms. Legenda: *"The forms.body scope is used to create and edit the form — title, questions and quiz answer keys — at the user's request."*
- **Cena 4 — Uso do forms.responses.readonly (~30s):** responder ao formulário antes (para ter 1 resposta); no Claude, pedir "liste as respostas deste formulário"; mostrar as respostas. Legenda: *"The forms.responses.readonly scope is used to read, read-only, the responses of the user's own forms."*
- **Cena 5 — Encerramento (~10s):** Legenda: *"All data flows directly between the user's computer and Google. There is no developer server; use complies with the Google API Services User Data Policy, including Limited Use."*

Depois: subir no YouTube como **Não listado (Unlisted)** e colar o link no formulário de verificação.
