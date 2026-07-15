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

## Apêndice B — Roteiro DETALHADO do vídeo de verificação (gravação no Mac)

**Requisitos do Google:** mostrar o **processo de concessão (OAuth grant)**, os **detalhes do app** (nome e Client ID) e **como cada escopo sensível é usado**. Duração ~2–4 min. Pode ser só gravação de tela com **legendas** — não precisa aparecer nem falar. **Idioma das legendas: inglês.**

### Decisão fixada
- **Gravar TUDO no Mac.** O projeto tem **dois** clientes OAuth (um por computador). No Mac, o cliente ativo é **`claude-forms-mcp`** (criado em 30/jun), Client ID:
  `384478266631-l2mnd0dcsq6oiom7t9jsp0u47ppbp7hj.apps.googleusercontent.com`
- **Regra de ouro:** o Client ID mostrado na Cena 1 tem que ser **o mesmo** que aparece na URL na Cena 2. Por isso, não misturar computadores. (Se um dia gravar no Windows, usar o cliente `claude-forms-mcp-windows-lenovo` nas duas cenas.)

### Preparação (na ordem, antes de gravar)
1. **Nome consistente:** App name no Branding = **Forms IA (MCP)** e páginas do site iguais.
2. **Gerar 1–2 respostas** no formulário "Pesquisa Forms IA (MCP)" (necessário para a Cena 4):
   abrir o link de responder e enviar respostas —
   `https://docs.google.com/forms/d/e/1FAIpQLSdCynJ0pIf8WCNH38XHPzaIWcDEfTqDNWefmaDLnK9USM62mw/viewform`
3. **Limpar a tela:** fechar abas pessoais (e-mail etc.), ocultar favoritos se tiver coisa pessoal; barra de endereço **visível** (não usar tela cheia que a esconda).
4. **Deixar abertas em abas:** a página de detalhes do cliente e a Branding (Cena 1).
5. **Revogar o acesso do app** (POR ÚLTIMO, logo antes de gravar): `https://myaccount.google.com/permissions` → **Forms IA (MCP)** → **Remover acesso** → Confirm.
   - Os formulários e respostas **não** são apagados; só o acesso é cortado.
   - ⚠️ Isso invalida o token dos **dois** computadores — depois do vídeo, o **Windows** vai pedir reautorização (rodar o comando token lá de novo). Normal.
6. **Gravar a tela:** `Cmd + Shift + 5` → "Gravar tela inteira" → Gravar. Pode gravar tudo seguido e cortar no Final Cut.

### Cena 1 — Identidade do app (~20s)
1. Abrir `https://console.cloud.google.com/auth/clients?project=claude-forms-mcp-501013`.
2. **Clicar no NOME do cliente** `claude-forms-mcp` (na lista o ID aparece cortado; o ID **completo** só aparece na página de detalhes, na seção "Additional information"). Deixar o ID completo visível por ~5s.
3. Ir em **Branding** e mostrar **App name: Forms IA (MCP)**.
> *Legenda:* "App: Forms IA (MCP), Google Cloud project claude-forms-mcp. OAuth client ID: 384478266631-l2mnd0dcsq6oiom7t9jsp0u47ppbp7hj.apps.googleusercontent.com. A local, open-source MCP server."

### Cena 2 — Concessão OAuth (~50s)
1. Abrir o **Terminal** e rodar: `npx -p mcp-server-google-forms mcp-server-google-forms-token`
2. O navegador abre a tela do Google. **Parar ~3–5s com a URL visível** (ela contém `client_id=384478266631-l2mn…`).
3. Escolher a conta → na tela **"app não verificado"**, clicar **Avançado → Continuar** → mostrar a lista de permissões (formulários / ver respostas) → **Permitir**.
4. Voltar ao Terminal e mostrar *"Pronto. refreshToken salvo…"*.
> *Legendas:* "The user runs the authorization command." / "Google consent screen — note the client ID in the URL." / "The user grants the requested scopes."
> ⚠️ Na edição, a legenda desta cena vai **embaixo**, longe da barra de endereço.

### Cena 3 — Uso do forms.body (~40s)
1. No **Claude**, pedir (colando o link de editar):
   `No formulário Pesquisa Forms IA (MCP) (https://docs.google.com/forms/d/1YD2atJptaJg9NGHRsxCPT9h6cltSRbz7snW935qzWIs/edit), adicione uma pergunta de resposta longa: "O que podemos melhorar?"`
2. Mostrar o Claude usando a ferramenta e confirmando.
3. Abrir/atualizar o formulário no Google Forms e mostrar a **nova pergunta**.
> *Legenda:* "The forms.body scope is used to create and edit the form — here, adding a question at the user's request."

### Cena 4 — Uso do forms.responses.readonly (~30s)
1. No **Claude**, pedir: `liste as respostas do formulário Pesquisa Forms IA (MCP) (ID 1YD2atJptaJg9NGHRsxCPT9h6cltSRbz7snW935qzWIs)`
2. Mostrar as respostas retornadas (as enviadas na preparação). Opcional: mostrar a aba "Respostas" no Google Forms.
> *Legenda:* "The forms.responses.readonly scope is used to read, read-only, the responses of the user's own forms."

### Cena 5 — Encerramento (~10s)
Tela: o formulário ou o Claude.
> *Legenda:* "All data flows directly between the user's computer and Google. There is no developer server; use complies with the Google API Services User Data Policy, including Limited Use."

### Edição (Final Cut Pro) e envio
1. Importar o `.mov` → timeline; cortar pausas.
2. Legendas: ícone **Titles and Generators** (o "T") → buscar **Basic Title** → arrastar para a trilha ACIMA do vídeo em cada cena → duplo-clique para digitar → ajustar duração esticando as bordas. Na Cena 2, posicionar a legenda embaixo (Inspector → Position → Y negativo).
3. Exportar: **File → Share → Export File (Master File)**.
4. Subir no **YouTube como "Não listado" (Unlisted)** e colar o link no formulário de verificação.

### Checklist antes de enviar o vídeo
- [ ] Client ID completo legível na Cena 1 (página de DETALHES do cliente, não a lista).
- [ ] Mesmo Client ID visível na URL da Cena 2.
- [ ] Nome "Forms IA (MCP)" aparece (Branding e/ou tela de consentimento).
- [ ] As duas funções demonstradas (editar/criar + ler respostas).
- [ ] Nenhum dado pessoal alheio na tela.
