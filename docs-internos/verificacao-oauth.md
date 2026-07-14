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
- [ ] Verificação **ainda não enviada**.

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
- [ ] Verificar a posse de `henriquealvarenga.com` no [Google Search Console](https://search.google.com/search-console) (mesma conta Google do projeto).
- [ ] Hospedar no domínio próprio, públicas: **página inicial**, **política de privacidade** e **termos de uso**. (Os textos já existem no `github.io`; publicar cópias no `henriquealvarenga.com`.)

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

Itens de escrita já combinados, a fazer numa próxima sessão:

1. [ ] **Justificativas dos escopos** — texto pronto para colar no formulário de verificação (prioridade: os dois sensíveis).
2. [ ] **Política de privacidade atualizada** — a atual precisa citar explicitamente o acesso aos dados do Google e a conformidade com a **Limited Use** do *Google API Services User Data Policy* (requisito da verificação).
3. [ ] **Roteiro do vídeo** de demonstração.
4. [ ] (Opcional) **Página inicial** simples no domínio próprio descrevendo o app.

Sugestão de ordem: **1 + 2 primeiro** (é o que o Google mais examina e destrava o envio).

## Outras frentes do Modelo B (depois da verificação aprovada)

Estas não fazem parte da verificação, mas completam o Modelo B — só "virar a chave" quando a verificação sair:

- [ ] **Código/pacote:** embutir a credencial compartilhada (client_id + client_secret) como padrão, para o professor **não precisar baixar nada** do Google Cloud. Mexe em `scripts/get-token.js` / `src/credentials-dir.js`.
- [ ] **Manual:** remover o **Passo 1 (Google Cloud)** do fluxo do professor (vira: instalar → rodar o comando → login → `claude mcp add`). Guardar o Passo 1 num apêndice "para quem quer usar o próprio projeto".

## Onde retomar

Comece pela **Etapa 1** (verificar o domínio no Search Console — independe da IA) e peça à IA os itens **1 e 2** da lista "O que a IA vai produzir".
