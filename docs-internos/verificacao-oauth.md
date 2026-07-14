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

1. [ ] **Justificativas dos escopos** — texto pronto para colar no formulário de verificação (os dois sensíveis). **← próximo item**
2. [x] **Política de privacidade** — feita (arquivo `privacidade.html` entregue, com a seção *Limited Use*).
3. [ ] **Roteiro do vídeo** de demonstração.
4. [x] **Página inicial** descrevendo o app — feita (`index.html`).

Próximo item pendente: **justificativas dos escopos** (item 1) e depois o **roteiro do vídeo** (item 3).

## Outras frentes do Modelo B (depois da verificação aprovada)

Estas não fazem parte da verificação, mas completam o Modelo B — só "virar a chave" quando a verificação sair:

- [ ] **Código/pacote:** embutir a credencial compartilhada (client_id + client_secret) como padrão, para o professor **não precisar baixar nada** do Google Cloud. Mexe em `scripts/get-token.js` / `src/credentials-dir.js`.
- [ ] **Manual:** remover o **Passo 1 (Google Cloud)** do fluxo do professor (vira: instalar → rodar o comando → login → `claude mcp add`). Guardar o Passo 1 num apêndice "para quem quer usar o próprio projeto".

## Onde retomar

Feito até aqui: domínio verificado; páginas (home/privacidade/termos) prontas e entregues; política com *Limited Use* pronta.

Próximos passos, na ordem:
1. **Henrique:** subir os 4 arquivos no repo `henriquealvarenga/mcp` e ligar o GitHub Pages; conferir que `https://henriquealvarenga.com/mcp/` abre.
2. **IA:** escrever as **justificativas dos escopos** (item 1 da lista) e o **roteiro do vídeo** (item 3).
3. **Henrique:** preencher a Tela de permissão OAuth (nome "Formulários para Claude", as 3 URLs, domínio autorizado) e **enviar para verificação**.
