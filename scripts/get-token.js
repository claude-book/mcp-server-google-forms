#!/usr/bin/env node
// Ajudante de autorização — rodar UMA vez: `npm run token` (clone) ou
// `npx -p mcp-server-google-forms mcp-server-google-forms-token` (npm).
// Lê o arquivo de credenciais baixado do Google Cloud (client_secret*.json),
// abre o navegador para você autorizar e salva o refreshToken em config.json.
// A pasta das credenciais é resolvida por src/credentials-dir.js
// ($GOOGLE_FORMS_MCP_DIR → credentials/ do projeto → ~/.config/mcp-server-google-forms/).

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { google } from "googleapis";
import { credentialsDir } from "../src/credentials-dir.js";

const CRED_DIR = credentialsDir();

// Escopos: criar/editar o corpo do formulário, LER respostas e acessar arquivos criados por este app.
const SCOPES = [
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

// Localiza o client_secret*.json que você baixou do Google Cloud.
fs.mkdirSync(CRED_DIR, { recursive: true });
const credFile = fs
  .readdirSync(CRED_DIR)
  .find((f) => f.startsWith("client_secret") && f.endsWith(".json"));
if (!credFile) {
  console.error(
    `Não encontrei nenhum 'client_secret*.json' em ${CRED_DIR}\n` +
      "Baixe o arquivo de credenciais (tipo 'App para computador') do Google Cloud e coloque-o nessa pasta."
  );
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(path.join(CRED_DIR, credFile), "utf8"));
const creds = raw.installed || raw.web;
if (!creds) {
  console.error("Formato de credenciais inesperado. Use credenciais OAuth do tipo 'App para computador'.");
  process.exit(1);
}

// O 'state' amarra a resposta do Google a ESTA execução (proteção CSRF):
// o callback só aceita a autorização que carregar este valor de volta.
const state = crypto.randomBytes(16).toString("hex");
let oauth2; // criado depois que soubermos a porta

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${httpServer.address().port}`);
    if (url.searchParams.get("state") !== state) {
      res.statusCode = 400;
      res.end("Resposta de autorização não reconhecida (state não confere). Volte ao terminal e tente de novo.");
      return; // não encerra: a resposta legítima ainda pode chegar
    }
    const code = url.searchParams.get("code");
    if (!code) {
      res.end("Sem código de autorização. Tente novamente.");
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    // O Google pode não enviar o refresh_token (ex.: autorização anterior ainda
    // ativa). Sem ele o servidor não funciona — melhor falhar aqui, com instrução,
    // do que gravar um config incompleto e "dar certo" por engano.
    if (!tokens.refresh_token) {
      const msg =
        "O Google não enviou o refresh token. Remova o acesso deste app em " +
        "https://myaccount.google.com/permissions e rode 'npm run token' de novo.";
      res.end(msg);
      console.error("\n" + msg);
      httpServer.close(() => process.exit(1));
      return;
    }
    const configFile = path.join(CRED_DIR, "config.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify(
        { clientId: creds.client_id, clientSecret: creds.client_secret, refreshToken: tokens.refresh_token },
        null,
        2
      )
    );
    // O callback do res.end garante que o navegador recebe a página de sucesso
    // antes de o processo encerrar.
    res.end("Autorização concluída! Pode fechar esta aba e voltar ao terminal.", () => {
      console.log(`\nPronto. refreshToken salvo em ${configFile}`);
      httpServer.close(() => process.exit(0));
    });
  } catch (e) {
    res.end("Erro: " + e.message);
    console.error(e);
    httpServer.close(() => process.exit(1));
  }
});

httpServer.on("error", (e) => {
  console.error("Não consegui abrir o servidor local de autorização: " + e.message);
  process.exit(1);
});

// Porta 0 = o sistema escolhe uma porta livre. Clientes OAuth do tipo
// "App para computador" aceitam qualquer porta no redirect de loopback,
// então nada precisa ser configurado no Google Cloud.
httpServer.listen(0, () => {
  const redirect = `http://localhost:${httpServer.address().port}`;
  oauth2 = new google.auth.OAuth2(creds.client_id, creds.client_secret, redirect);
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
  console.log("\nAbra esta URL no navegador e autorize o acesso:\n\n" + authUrl + "\n");
  openBrowser(authUrl);
});

// Tenta abrir o navegador conforme o sistema operacional; se falhar,
// a URL já foi impressa acima e pode ser aberta manualmente.
function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? `open "${url}"`
    : process.platform === "win32" ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}
